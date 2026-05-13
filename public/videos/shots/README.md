# Shot preview videos

Drop a video here for each shot type to surface a hover-preview on the Animate
Single picker. The filename must match the shot id from `src/lib/shot-types.ts`.

## Expected filenames (one .mp4 per shot, 9:16 vertical, 5 seconds, 1080p)

### Linear
- `push_in.mp4`
- `pull_out.mp4`
- `establishing.mp4`

### Lateral
- `truck_left.mp4`
- `truck_right.mp4`
- `slide_left.mp4` (alias of truck_left — can be same file)
- `slide_right.mp4` (alias of truck_right — can be same file)
- `pan_left.mp4`
- `pan_right.mp4`
- `parallax_left.mp4`
- `parallax_right.mp4`

### Vertical
- `reveal_rise.mp4`
- `tilt_up.mp4`
- `tilt_down.mp4`
- `pedestal_up.mp4`
- `pedestal_down.mp4`

### Rotational
- `orbit_left.mp4`
- `orbit_right.mp4`
- `drone_orbit.mp4`
- `camera_roll.mp4`

### Architectural
- `architectural.mp4`

## Optional posters
Drop a matching `{shot_id}.jpg` and it'll show as the poster (first frame
before hover). If missing, the video itself provides the still on hover-out.

## How it works
`ShotTypePicker.tsx` auto-resolves `/videos/shots/{shot_id}.mp4` and
`/videos/shots/{shot_id}.jpg` for every shot. Missing files silently fail
(the card shows a clean ink panel). Drop new files anytime — no rebuild
needed, just a redeploy of the frontend.

## Recording tips
- Record on a real listing image of yours
- Same camera move you're demoing
- 5 seconds is enough — the loop will repeat on hover
- Compress to < 1MB each (H.264, 24fps) so the picker stays snappy
