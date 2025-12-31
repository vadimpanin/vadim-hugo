---
title: "Offsite Backups with `restic` and AWS S3 Glacier Deep Archive"
date: 2025-12-29
tags: ["restic", "backups", "aws", "s3", "retention"]
featured: true
---

## Why S3 Glacier Deep Archive for backups

AWS S3 Glacier Deep Archive provides an exceptionally cost-efficient option for long-term data retention, at approximately **$1 per TB per month**. This makes it ideal for archival storage within compliance, disaster recovery, or 3‑2‑1 backup frameworks, where accessibility is secondary to durability and cost efficiency.

The trade-off lies in retrieval performance and cost. Data restoration can take **12–48 hours**, with retrieval fees averaging **$80–100 per TB**, depending on the number of files. This latency and pricing structure make Glacier Deep Archive unsuitable for frequent retrieval but optimal for infrequent, Disaster Recovery or compliance-driven storage needs.

Because of this, S3 Deep Archive is perfect for the "break‑glass" copy in a 3‑2‑1 strategy – cheap to keep, expensive to touch. For operational recovery, I maintain higher-access backups elsewhere. 

Finally, AWS S3 offers a set of features that meet most stringent data retention requirements. Versioning enables recovery of deleted or overwritten objects, while 2FA Delete enforces two‑factor approval for version removal. Object Lock and restrictive bucket policies enable append‑only, immutable storage, reducing exposure to ransomware and accidental changes. Combined with 11‑nines durability and multi-region redundancy, it's certainly an attractive option.

---

## Why restic

`restic` is a fast, open‑source backup tool written in **Go**. A single static binary runs on Linux, macOS, Windows, BSD, and even small ARM NAS boxes. It breaks files into chunks, encrypts them, and groups many chunks into large **pack files** to reduce per‑object IO costs on S3. This design gives **block‑level deduplication** that works across all snapshots and sources that use the same repository, so identical data is stored only once.

### Restic crash course

Before touching AWS, let's try `restic` locally to understand its workflow.

#### Initializing local restic repository

```bash
# password is better stored in a file, if not pulled from AWS secrets
export RESTIC_PASSWORD="nano-banana"
export RESTIC_REPOSITORY="~/backup-repo"
restic init
```

This will create a repo scaffolding, including configuration file, generate an encryption key encrypted by your password, create directories for packs and snapshots.

#### Adding files

```bash
restic backup ~/Documents
```

This will deduplicate, compress and encrypt your documents, create pack files, write index files and your first snapshot.

#### Listing snapshots

```bash
restic snapshots
```

Here's our first snapshot, note that it has a hostname and a source path. This will be important later.&#x20;

```bash
repository d1669a67 opened (version 2, compression level auto)
ID        Time                 Host          Tags    Paths                   Size
-------------------------------------------------------------------------------------
7a93183b  2025-12-29 20:23:36  test-laptop           /Users/user/Documents  3.232 GiB
-------------------------------------------------------------------------------------
```

If you run backup command again, a new snapshot will be created (even if nothing changed). You can use `--skip-if-unchanged` to override this behaviour and make `restic` create snapshots only if something has changed.

#### Listing files

```bash
restic ls 7a93183b
```

This will output a list of files we just backed up. Note that each file has an absolute path.&#x20;

So far so good, listing snapshots and files doesn't read pack files, only snapshots and indexes.

## Restic and AWS S3

Restic is built with AWS SDK and therefore doesn't require \`aws-cli\` to be installed. It reads credentials either from `~/.aws/credentials` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables. If you prefer the credentials file, make sure to use lowercase letters.

Go ahead and create your AWS S3 bucket, enable versioning and disable public access.

Create a dedicated IAM user specifically for backups, and give it access to the bucket. For full-access and append-only IAM Policy JSON look at this addendum (link).

Change your environment repository path to S3 one and run \`restic init\`

```bash
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/bucket-name"
restic init
```

Since **restic 0.18.0** metadata (`index/`, `snapshot/`, `config/`, `keys/`, `locks/`) is  uploaded with **S3 Standard storage class**, while data packs can be placed in **Deep Archive** or kept in **Standard**.

```bash
restic backup ~/Documents \
    -o s3.storage-class=DEEP_ARCHIVE
```

This allows to perform operations such as backing up, listing snapshots and files immediately. While restore requires a 12-hour wait time.

## Restoring from Deep Archive

At this very moment restoring from cold storage is still an alpha feature[^alpha]. However, it's expected to get out of alpha pretty soon.

1. **Enable automatic object restore** and kick off recovery:
   ```bash
   export RESTIC_FEATURES=s3-restore
   restic restore latest \
       -o s3.enable-restore=1 \
       -o s3.restore-days=7 \
       --target /tmp/restore
   ```
2. Wait (12–48 h) while S3 thaws the required packs. Restic polls and then downloads.
3. Note that retrieval and egress fees for S3 DEEP\_ARCHIVE are close to \$80 USD per 1TB

Which means that S3 Glacier Deep Archive is best used as cheap tape storage. It's cheap to keep, but restoring from it should ideally be the last resort.

## Prune & Forget in Cold Storage

We can still use retention rules and delete old snapshots. Pruning packs however is not feasible with S3 Deep Archive because it requires thawing + egress, which is costly. It is easier to do a backup into a fresh bucket, and retire the old one according to your retention rules.

A lightweight `restic check` without `--read-data` is safe; it touches only metadata in STANDARD. [FIXME: add a bit here about regular small scale thawing]

---

## Multi‑Source backups: One repo, many machines

Remember I told you that each snapshot has a host name? Snapshots are independent this way. Two machines can have the same set of work files and backup into the same restic repository. Each can be restored separately using `--host` key. Each benefit from deduplication on block level.

You can use it in various ways:

- You can backup the same Syncthing share from multiple machines (you can even reuse .stignore files with `--exclude-file` )
- You can backup iCloud files from multiple laptops sharing the same Apple Id
- You can backup both from your laptop and from your NAS

There are also tags and paths, which also help if you need to backup from multiple sources inside the same machine.

---

## Snapshot‑Based Sources (ZFS, NAS) & Stable Paths

ZFS snapshots have many advantages over backing up live data, but are usually dated like `/tank/data/.zfs/snapshot/2025-12-29/`. A changing top‑level path forces restic to create a new snapshot with a bunch of "new" files. Which are deduplicated of course, but it's sub-optimal. I ended up just creating `restic-latest` ZFS snapshot alongside my dated snapshots to counter that. Hopefully in future versions we will get the ability to control snapshot paths directly

##

---

## Final Thoughts

Between Microsoft OneDrive (\$130/year for 6TB on Family Plan) and Hetzner Storagebox (Eur130/year for 5TB), AWS S3 Deep Archive achieves record breaking \$60/year per 5TB and `restic` is a convenient tool to group your small files into packs and save on IO.

Plus, you can set it up as append only using IAM, MFA‑Delete, Object‑Lock to guard against threats.

And with AWS prepaid, you can host your files for years to come. Just don't forget to save a copy of restic binary close by, just in case.



## Addendum A - IAM Policies

### Full‑Access IAM Policy

Use this policy when the backup process needs full read‑write control, including object deletion and S3 object‑tag management:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BucketLevel",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::my-homelab-backups"
    },
    {
      "Sid": "ObjectLevelRW",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::my-homelab-backups/*"
    },
    {
      "Sid": "TagControl",
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectTagging",
        "s3:PutObjectTagging",
        "s3:DeleteObjectTagging"
      ],
      "Resource": "arn:aws:s3:::my-homelab-backups/*"
    }
  ]
}
```

### Append‑Only IAM Policy

Create a dedicated IAM user and grant **append‑only** rights so compromised hosts can’t delete backups:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::my‑homelab‑backups"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::my‑homelab‑backups/*"
    }
  ]
}
```

Enable **Versioning + MFA‑Delete** or **Object‑Lock (Governance)** on the bucket for extra ransomware protection.


[^alpha]: restic.readthedocs.io [Are “cold storages” supported?](https://restic.readthedocs.io/en/latest/faq.html#are-cold-storages-supported)