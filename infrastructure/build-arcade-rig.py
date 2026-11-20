#!/usr/bin/env python3
"""Give the arcade's characters a skeleton and a walk.

build-arcade-3d.py makes still models. Mirror Bay wanted people who actually
walk and run, so this sends each finished character to fal's Meshy rigging
endpoint (a skeleton plus a walking and a running clip), then packs the result
for the web: one GLB per character holding the skinned mesh and both clips,
welded, WebP texture, quantized.

    FAL_KEY=... python3 infrastructure/build-arcade-rig.py --raw /tmp/art3d [--only shieldy kai]

The source of each rig is the still model frontend/assets/arcade3d/<name>.glb.
Mirror Bay's own cast (iris, kai, mina, vale, lila, tomas, captain, baker) is
only shipped rigged, so rebuild their still models first if the cache is gone:
    python3 infrastructure/build-arcade-3d.py --raw /tmp/art3d --only iris kai ...

Raw downloads are cached under --raw/rig, so re-running only pays for what is
missing. Output: frontend/assets/arcade3d/r-<name>.glb. Requires node/npm.
"""
import argparse, concurrent.futures as cf, json, os, pathlib, subprocess, sys
import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "assets" / "arcade3d"
RIG = "https://fal.run/fal-ai/meshy/rigging"
# name -> height in metres (only the proportions matter; the game scales them again)
PEOPLE = {
    "shieldy": 1.2, "pixel": 1.2, "bot": 1.2, "dame": 1.7, "sprout": 1.0, "glitch": 1.3,
    "citizen-a": 1.6, "citizen-b": 1.3, "citizen-c": 1.6, "citizen-d": 1.8, "citizen-e": 1.7,
    "citizen-f": 1.2, "citizen-g": 1.3, "citizen-h": 1.7,
    "iris": 1.7, "kai": 1.7, "mina": 1.1, "vale": 1.7, "lila": 1.3, "tomas": 1.3, "captain": 1.75, "baker": 1.7,
}
PACK = r"""
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, resample, prune, dedup, quantize, textureCompress, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [walk, run, out, px, ratio] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(walk), other = await io.read(run), root = doc.getRoot();
const byName = {}; root.listNodes().forEach(n => { byName[n.getName()] = n; });
root.listAnimations()[0].setName('walk');
const buf = root.listBuffers()[0], src = other.getRoot().listAnimations()[0], dst = doc.createAnimation('run');
const copy = a => doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buf);
for (const ch of src.listChannels()) {
  const node = byName[ch.getTargetNode().getName()]; if (!node) continue;
  const s = ch.getSampler(), ns = doc.createAnimationSampler().setInput(copy(s.getInput())).setOutput(copy(s.getOutput())).setInterpolation(s.getInterpolation());
  dst.addSampler(ns).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(ch.getTargetPath()).setSampler(ns));
}
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { p.setAttribute('TANGENT', null); p.setAttribute('NORMAL', null); }   // normals are rebuilt in the game; without them the faces weld
await MeshoptSimplifier.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.004 }), resample(), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, resize: [+px, +px] }), dedup(), prune(), quantize({ quantizeWeight: 8 }));
await io.write(out, doc);
const tris = root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + p.getIndices().getCount() / 3, 0), 0);
console.log(JSON.stringify({ tris, clips: root.listAnimations().map(a => a.getName()) }));
"""


def upload(path, key):
    """fal's storage: ask for a slot, PUT the file, get back a public URL."""
    r = requests.post("https://rest.alpha.fal.ai/storage/upload/initiate",
                      headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
                      json={"file_name": path.name, "content_type": "model/gltf-binary"}, timeout=120)
    r.raise_for_status(); d = r.json()
    requests.put(d["upload_url"], data=path.read_bytes(), headers={"Content-Type": "model/gltf-binary"}, timeout=600).raise_for_status()
    return d["file_url"]


def rig(name, key, raw, px, ratio):
    walk, run = raw / f"{name}-walk.glb", raw / f"{name}-run.glb"
    if not (walk.exists() and run.exists()):
        url = upload(OUT / f"{name}.glb", key)
        r = requests.post(RIG, headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
                          json={"model_url": url, "height_meters": PEOPLE[name]}, timeout=1200)
        if not r.ok:
            raise RuntimeError(f"{name}: {r.status_code}: {r.text[:300]}")
        b = r.json()["basic_animations"]
        walk.write_bytes(requests.get(b["walking_glb"]["url"], timeout=600).content)
        run.write_bytes(requests.get(b["running_armature_glb"]["url"], timeout=600).content)
    out = OUT / f"r-{name}.glb"
    res = subprocess.run(["node", str(raw / "pack.mjs"), str(walk), str(run), str(out), str(px), str(ratio)],
                         check=True, capture_output=True, text=True, cwd=raw)
    return name, out.stat().st_size, res.stdout.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--px", type=int, default=512)
    ap.add_argument("--ratio", type=float, default=0.75)
    a = ap.parse_args()
    key = os.environ.get("FAL_KEY") or sys.exit("FAL_KEY not set")
    raw = pathlib.Path(a.raw) / "rig"; raw.mkdir(parents=True, exist_ok=True)
    if not (raw / "node_modules" / "@gltf-transform").exists():
        subprocess.run(["npm", "i", "--silent", "--prefix", str(raw), "@gltf-transform/core@4", "@gltf-transform/extensions@4",
                        "@gltf-transform/functions@4", "meshoptimizer", "sharp"], check=True)
    (raw / "pack.mjs").write_text(PACK)
    failed = []
    with cf.ThreadPoolExecutor(6) as ex:
        jobs = {ex.submit(rig, n, key, raw, a.px, a.ratio): n for n in (a.only or list(PEOPLE))}
        for j in cf.as_completed(jobs):
            try:
                n, size, info = j.result(); print(f"  r-{n:10} {size // 1024} KB  {info}")
            except Exception as e:   # one stubborn character should not stop the rest
                failed.append(jobs[j]); print(f"  FAILED {jobs[j]}: {str(e)[:300]}")
    if failed:
        sys.exit("failed: " + " ".join(failed))


if __name__ == "__main__":
    main()
