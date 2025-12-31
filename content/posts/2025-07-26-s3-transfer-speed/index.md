---
title: "Shaving 60 % off S3 Upload Times with the AWS C++ SDK"
date: 2025-07-26
tags: ["cpp", "aws", "s3", "performance"]
categories: ["backend"]
description: >
  Using the TransferManager’s multipart tuning knobs and a dash of SIMD, I cut a
  1.2 GB upload from 42 s to 17 s on a 1 Gbps link. Here’s the exact patch + benchmark.
images: ["hero.png"]    # optional hero header if you drop an image here
featured: true
---

> TL;DR — bump **`partSize`** to 64 MiB, pin the call to a fat core, and reserve
> an aligned buffer for AVX2 checksum calculation.

## 1 · Baseline numbers

byte boundary and still keeps the false-positive rate around 3 %


```txt
$ aws s3 cp 1.2G.bin s3://bench/
Completed 1.2 GiB in **42.3 s**  (29.7 MB/s)
```


{{< thumb "screenshot.png" "CLI output" >}}


{{< figure
     src="screenshot.png"
     link="screenshot.png"
     alt="CUDA profiler flame‑graph"
     caption="Kernel hot spots (shorter bars = faster)"
     class="thumb"
>}}