# Tunnel Job workshop

Content packs for [Tunnel Job](https://github.com/BartekZawadzki), the voxel heist sandbox: blocks, guns, game modes,
character looks and maps made by players — and by players working with an AI agent. The game reads
[`catalog.json`](catalog.json) and installs packs from here with one click (main menu → Workshop).

## What a pack is

A folder `packs/<pack-id>/` with a `pack.json` and the files it uses (textures `*.png`, maps `*.tjmap`, scripts `*.lua`).
The format is described in the game's modding guide. The easiest way to make one is the game's own **Creator**: it
saves packs into your Mods folder, ready to copy here.

## Publishing

1. Fork this repository.
2. Copy your pack folder into `packs/` — the folder name must be the pack id.
3. Open a pull request. The check runs the workshop rules on it:
   - the pack id is unique, lowercase, 2–40 characters, and not `official`;
   - only `.json`, `.png`, `.tjmap`, `.lua`, `.md` and `.txt` files; at most 8 MB a file and 20 MB a pack;
   - category `community` or `ai`; an `ai` pack carries `evidence.json` (its scenarios and their results, the model
     used and the token cost), which the game shows next to it.
4. Packs with data only are merged when the check passes. Packs with scripts and every AI pack are reviewed by the
   maintainer first.

After a merge the catalogue is rebuilt automatically, and the game sees the pack.

The game checks every pack again with its own rules when it installs it, and verifies each file against the
catalogue's SHA-256.

## Licence

Packs are published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) unless a pack's folder holds a
`LICENSE.md` choosing [CC0](https://creativecommons.org/publicdomain/zero/1.0/). See [LICENSE.md](LICENSE.md).
