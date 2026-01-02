---
title: "Making a lean and mean RDP machine out of Linux Mint 22"
date: 2025-07-27
tags: ["rdp", "remote desktop", "linux", "performance", "xrdp"]
featured: true
---

> Linux Mint 22.1 (and any Ubuntu-based distro, really) can now be turned into a lean and mean RDP machine with surprisingly little effort.
> By installing XRDP with H.264 support and doing some minor config, we get feature parity with Windows RDP servers in terms of performance, audio, and convenience. 



Having an option to use a lightweight, headless VM for development is incredibly convenient. You can set up a clean, isolated environment for each project and access it remotely, keeping your main system clean. You can run it on your half-a-petabyte RAM server in your basement (or on an instance in the cloud). You can connect to it from multiple devices, including iPads/iPhones and tablets of all kinds, maybe even while waiting for an appointment or riding a train. Of course, you can use VS Code remote connection feature, or just SSH into it and use your favorite terminal multiplexer. But there's something in having a complete desktop GUI environment, set up for a specific project, that is available from virtually anywhere, and ready to go at moment's notice.

For years, however, Windows led the charge in this area because its Remote Desktop Protocol (RDP) performance was significantly better than open-source alternatives. In practice,remote desktop on Linux has never quite been on par with Windows, at least not until recently. The native Windows RDP server (built into Windows Pro/Server editions) had features like RemoteFX/h264 compression that even used hardware acceleration, giving users a super smooth experience over the network. Meanwhile, Linux users were often stuck with VNC or older XRDP versions that felt sluggish over anything but a local network.

Today we'll focus on why H.264 support is a game-changer for snappy performance, how to get it running, and why this makes Linux a real contender against Windows for remote access.


## XRDP Adds H.264 Support
**XRDP** is an open-source server that speaks the RDP protocol, allowing you to remote into a Linux box using any standard RDP client. It's been around for years, but historically used less efficient graphics codecs. That changed with the XRDP 0.10.2 release around the end of 2024, which added support for H.264/AVC video encoding.[^1]

Under the hood, XRDP's H.264 support is powered by either the open-source **x264** library or Cisco's **OpenH264**. The XRDP developers note that x264 tends to provide a smoother experience than OpenH264, so x264 is recommended if you have both available.[^bothencs] In practical terms, that means XRDP needs to be compiled with the `--enable-x264` flag (and optionally `--enable-openh264`) to include this feature. Most distro-provided XRDP packages do not include H.264 support by default (due to licensing and repository policies), so you might have to install a special build or compile it yourself - we'll cover an easy way to do this via a PPA in the next section.

The best bit is that H.264 support in XRDP isn't some proprietary hack - it works within the standard RDP graphics pipeline (a.k.a. RemoteFX AVC444). That means you can **use any existing Remote Desktop client** (Windows mstsc.exe, Microsoft Remote Desktop app on macOS, FreeRDP/Remmina on Linux, mobile RDP apps such us Jump Desktop, etc.) and it will automatically negotiate the H.264 codec if both sides support it. For example, the default Windows RDP client will happily use H.264 when talking to an XRDP server built with this capability. There's nothing fancy you need to do client-side - just make sure your client is relatively modern.

With H.264 in place, XRDP's performance is finally on par with a Windows RDP server. Lower bandwidth usage translates to less lag, and the improved compression means even high-resolution desktops or video playback can be remotely viewed with decent frame rates. If you have a GPU available, XRDP can even leverage hardware encoding to further boost performance. This can further cut CPU usage for remote sessions, however even CPU-based libx264 encoding is sufficient on modern hardware. In short, H.264 turns XRDP into a remote desktop powerhouse.

It's worth mentioning that this is a relatively new feature. As of XRDP 0.10.2, H.264 support is marked stable, but you might encounter minor quirks (for example, autodetect settings always default to 'LAN' profile since XRDP can't yet autodetect network conditions).[^defaultlan]


## Alternatives with H.264 support: NoMachine, RustDesk
There are existing thirdparty solutions that don't support RDP protocol, but have H.264 support: **NoMachine** and **RustDesk**. However, there are a few reasons you might **prefer XRDP** over those solutions in a development or self-hosted environment:

- **No Third-Party Servers:** Tools like TeamViewer, AnyDesk, and by default RustDesk, are designed to easily connect across the internet by relaying through vendor-operated servers. That's convenient, but some see it as a security risk or privacy issue. RustDesk can be self-hosted to avoid using their relay, but out-of-the-box it's very much _"TeamViewer-like."_ XRDP, on the other hand, is just a service on your machine - you connect directly to it (over LAN or VPN or however you configure it). **There's no cloud mediation**. If you're setting up VMs per project on a hypervisor or in the cloud, you likely already handle networking, so you don't need or want a third-party brokering your connection.
    
- **Standard RDP Clients:** NoMachine and RustDesk each require their own client applications. RustDesk's client UI, for example, is different from what you might be used to in an RDP client. Setting up NoMachine requires admin privileges on a Mac. In contrast, XRDP lets you use any standard RDP client - the same one you might already use for Windows servers. This means you can fire up Microsoft's Remote Desktop Client (mstsc) or Remmina or Jump Desktop, and connect to your Linux VM just like you would to a Windows box. If your workflow involves multiple RDP connections, having everything under one client app can be a big plus.
    
- **Integration with Xorg and headless operation:** XRDP integrates seamlessly with Xorg and Linux PAM-authentication, enabling fully unattended operation without requiring users to be logged into the machine or configuring auto-login. It initiates a real Linux desktop session (such as Xfce, MATE, or GNOME) for each connection, leveraging a virtual desktop environment that automatically adapts to your client's screen size. Unlike tools such as RustDesk or TeamViewer, which typically mirror an existing desktop or require a pre-logged-in session, XRDP independently manages user sessions and supports multiple simultaneous connections ideal for multi-user setups similar to traditional terminal servers.

### How XRDP Integrates with Xorg and Desktop Environment

I think it's important to understand what XRDP really does in order to be able to debug potential issues. XRDP is really three cooperating pieces of software that hand off control in a relay race.

**`xrdp` service**
* **Systemd unit:** `xrdp.service`
* **Runs as:** system user `xrdp` (port 3389 is above 1024, so root privileges are not needed after startup).
* **What it does:** terminates the TLS/RDP handshake, collects the username / password / optional domain the client typed, and opens a local TCP connection to `sesman` on 127.0.0.1:3350 (legacy) or vsock.

**`xrdp-sesman` service**
* **Systemd unit:** `xrdp-sesman.service`
* **Runs as:** **root** (needs to `setuid()` to other users and start Xorg).
* **Receives from `xrdp`:** the credentials, requested session type, and channel capabilities.
* **What it does:** Authenticates via PAM (`/etc/pam.d/xrdp-sesman`), then picks an unused X display (e.g. `:10`). Spawns `Xorg` with the `xorgxrdp` driver on that display. Executes the helper `xrdp sesexec` and passes it the display number and session command (taken from the user's `~/.xsession` if it exists, otherwise from `DefaultWindowManager=` in `/etc/xrdp/sesman.ini`).

**`xrdp sesexec` helper**
* **Binary:** `/usr/libexec/xrdp-sesexec` (set uid root).
* **Starts as root, then immediately drops to the target user**, sets the env vars it was handed, and `exec()`s the session command typical choices are `xfce4-session`, `cinnamon-session`, `mate-session`.
* When that command exits (user logs out or DE crashes), sesexec returns control to sesman, which notifies the `xrdp` daemon to close the RDP channel.

**Configuration files**
* `/etc/xrdp/xrdp.ini`   listener port, TLS certificates, channel options.
* `/etc/xrdp/sesman.ini`   auth backend, `DefaultWindowManager=`, user script switch (`EnableUserWindowManager=`).
* `~/.xsession`   per user override that can contain a single line like `exec xfce4-session`.

**Logs**
* **Global logs:** `/var/log/xrdp.log` (handshake), `/var/log/xrdp-sesman.log` (auth, X startup).
* **Per‑display Xorg log:** `~/.xorgxrdp.:10.log` (driver errors, missing GL, etc.).
* **Per‑session error output:** `~/.xsession-errors`.
* **Systemd journal:** `journalctl -u xrdp -u xrdp-sesman` for crash traces.

## Installing XRDP (with x264) on Linux Mint 22.1 XFCE

So, how do we get an H.264-enabled XRDP on a distro like Linux Mint 22.1? The steps are fairly straightforward, since we can leverage a pre-built package. Mint 22.1 is based on Ubuntu 24.04 LTS (code-named  Noble ), and at the time of writing no major distro includes XRDP with H.264 in their official repos. Ubuntu's own `xrdp` package is built without FFmpeg/ 264 support (for example, running `xrdp -v` on the stock package will not show `--enable-x264` in the options). We could compile from source, but an easier route is to use a community PPA that provides ready-made XRDP builds with H.264 enabled.

The PPA `saxl/xrdp-egfx` is one such repository. It packages XRDP (and the accompanying Xorg driver module) with the "enhanced graphics" (egfx) pipeline enabled - which includes H.264 support. This PPA has builds for Ubuntu 22.04, 22.10, 23.10, and 24.04 series,[^ppa] meaning it covers Mint 21.x and 22, as well as other Ubuntu derivatives corresponding to those releases. Here's a quick compatibility rundown of which distro versions align with the PPA's Ubuntu base versions:

|Ubuntu Base (Code Name)|Examples of Distros Based on It|
|---|---|
|**22.04 LTS  Jammy **|Ubuntu 22.04 LTS and official flavors (Kubuntu 22.04, etc); Linux Mint 21/21.1/21.2  Vanessa/Vera/Victoria ; Pop!_OS 22.04; Elementary OS 7; Zorin OS 17 (if released on 22.04 base); etc.|
|**22.10  Kinetic **|Ubuntu 22.10 (short-term release) and any derivative that tracked 22.10 (relatively uncommon for derivatives - most stick to LTS).|
|**23.10  Mantic **|Ubuntu 23.10 (another interim release); not widely used in derivatives except perhaps as an Ubuntu testing ground. (If you're on Ubuntu 23.10 itself, the PPA has you covered.)|
|**24.04 LTS  Noble **|Ubuntu 24.04 LTS and flavors; Linux Mint 22.x  Wilma  (Mint 22 is based on 24.04); Pop!_OS 24.04, Kubuntu, Lubuntu, Ubuntu MATE, Ubuntu Budgie, Xubuntu|

For our case - **Linux Mint 22.1 XFCE**[^mint] - the base is Ubuntu 24.04 (Noble), so we can use the PPA's _Noble_ packages. The process is: add the PPA, install the `xrdp-egfx` packages, and enable the service. We'll also install the PulseAudio modules for audio redirection and do a bit of config for our  headless  user session. Let's go step by step:

```bash
# Make sure you don't have xrdp and xorgxrdp installed
# `sudo apt remove xrdp xorgrdp`

# Add xrdp-egfx PPA, includes x264-enabled xrdp and xorgxrdp
sudo add-apt-repository -y ppa:saxl/xrdp-egfx
sudo apt update

# Check if xrdp is running
systemctl status xrdp

# Optional: If xrdp service is not running, enable it
sudo systemctl enable --now xrdp

# Optional: Normally during xrdp installation `/etc/xrdp/sesman.ini` gets updated
# with proper `DESKTOP_SESSION` identifier. For example:
#   `xfce` for xfce
#   `ubuntu-xorg` for gnome
# If it didn't happen, we can explicitly override it with proper binary. For XFCE:
echo "xfce4-session" > ~/.xsession

# At this point you should be able to connect remotely using your RDP client,
# albeit without sound; let's install pulseaudio, because the PPA provides
# pulseaudio-module-xrdp; this will require removal of pipewire-alsa and pipewire-audio
sudo apt install -y pulseaudio pulseaudio-module-xrdp
sudo usermod -aG audio user  # replace "user" with your username
systemctl --user enable pulseaudio

# **Reboot** the system after installing pulseaudio,
# or, optionally, restart pulseaudio for the user and reconnect.
systemctl --user restart pulseaudio
```

A few notes on the above:

- The PPA packages are named `xrdp-egfx` and `xorgxrdp-egfx` to avoid clashing with the official ones. These builds have the H.264 support compiled in - you can verify by running `xrdp -v` and looking for `--enable-x264` in the output.[^1]
    
- We also install `pulseaudio-module-xrdp`. This is the PulseAudio module that XRDP uses to funnel sound from the Linux system to your RDP client (so you can hear audio remotely). Mint (and Ubuntu) might have this module available by default, but the PPA provides a version if needed. We ensure PulseAudio is present as well.
    
- After installation, XRDP should be running (it typically listens on port 3389 by default). We enable it at startup with `systemctl enable --now xrdp`.
    
- Adding the user to the `audio` group is important for sound on some systems. It's very probable that your RDP client and pulseaudio have different sound sample rates.
If you experience high pitched or slow-mo audio, edit /etc/pulse/daemon.conf:[^pitch]
```ini
default-sample-rate = 22050
alternate-sample-rate = 44100
```
After changing those, restart PulseAudio or reboot the VM, and try the RDP session again.
    
- In our Mint XFCE case, we echo `xfce4-session` into the user's `~/.xsession` file. This ensures that when XRDP creates a session, it will run `xfce4-session`. If you were using Mint's Cinnamon edition, you might put `cinnamon-session` there; for MATE, `mate-session`.

- It's important to note that XRDP does not support Wayland sessions as of now. It relies on Xorg. Many modern distros (Ubuntu, Fedora, etc.) default to Wayland for local login, but they still have X11 available (and XRDP will spawn an Xorg session in the background). Mint 22.1 with XFCE uses X11 anyway (XFCE isn't Wayland yet), so it's a non-issue here. If you were trying this on, say, Ubuntu 24.04 with GNOME (Wayland), you'd need to ensure an Xorg session is used for XRDP. The good news is XRDP can automatically launch a separate Xorg display even if your system uses Wayland by default - it runs its own X server via `xorgxrdp`. Just be aware you can't remote into an existing Wayland session.

Once the above steps are done, you should be able to remote desktop into your Mint 22.1 machine from another computer. Use any RDP client, enter the IP or hostname of the machine, and you should see the XRDP login screen. Enter the username and password you set up, and you'll be connected to an XFCE desktop session running on the VM. If everything is configured correctly, the RDP client and XRDP will negotiate the H.264 codec for graphics. You can confirm this by setting `LogLevel=DEBUG` in `/etc/xrdp/xrdp.ini` and checking the XRDP log (`/var/log/xrdp.log`); look for a line that says `[codec] h264_encoder = x264` rather than an RFX or bitmap session. If you see H.264 mentioned, congrats - you're now leveraging the same video encoding for your remote desktop that was available on Windows since 2016!

If you see an SSL certificate permissions error `/etc/xrdp/key.pem`, there's an easy fix and an explanation:[^cert]
```bash
sudo adduser xrdp ssl-cert
```

At this stage, we have a functional headless VM that we can RDP into with excellent performance. But we're not done - let's talk about a few **performance tuning tips** to really make it fly.


### Bonus - headless user
```bash
# Add the H.264-enabled XRDP PPA
sudo add-apt-repository -y ppa:saxl/xrdp-egfx
sudo apt update

# Install XRDP with H.264 support and audio redirection
sudo apt install -y xrdp-egfx xorgxrdp-egfx pulseaudio pulseaudio-module-xrdp

# Enable and start XRDP service
sudo systemctl enable --now xrdp

# Create a headless user (or use an existing one)
sudo useradd -m rdpuser
sudo usermod -aG audio rdpuser

# Configure user session for XFCE
sudo -u rdpuser bash -c 'echo "xfce4-session" > ~/.xsession'

# Restart PulseAudio for the user (may be required for audio)
sudo systemctl --user restart pulseaudio
```

[^1]: c-nergy.be [xrdp - New release available (0.10.2)](https://c-nergy.be/blog/?p=20148)
[^bothencs]: lists.debian.com [Bug#1093722: Build with H.264 support](https://lists.debian.org/debian-remote/2025/01/msg00058.html)
[^ffmpeg]: github.com [xrdp with egfx pipeline testrun #2383](https://github.com/neutrinolabs/xrdp/discussions/2383)
[^defaultlan]: mainkir.com [gfx.toml - Configuration file for xrdp(8) graphics pipeline extension](https://www.mankier.com/5/gfx.toml#:~:text=List%20of%20available%20connection%20types,are)
[^ppa]: answers.launchpad.net [xrdp with egfx git branch ](https://answers.launchpad.net/~saxl/+archive/ubuntu/xrdp-egfx)
[^mint]: linuxmint.com [Linux Mint 22.1 "Xia" Xfce Edition](https://linuxmint.com/edition.php?id=320)
[^pitch]: github.com [pulseaudio-module-xrdp - Wrong sampling rate in audio #43](https://github.com/neutrinolabs/pulseaudio-module-xrdp/issues/43)
[^cert]: c-nergy.be [xRDP – cannot read /etc/xrdp/key.pem. Permission denied error explained](https://c-nergy.be/blog/?p=13708)