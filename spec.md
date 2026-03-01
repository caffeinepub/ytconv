# YT Converter

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- YouTube to MP3 / MP4 converter web app
- URL input field that accepts YouTube video links
- Format selector: MP3 or MP4
- MP3 quality selector: 64k, 128k, 192k, 256k, 320k
- Convert button that calls the ezconv API
- Download button shown after successful conversion
- "Convert Next" button to reset and convert another video
- Loading / converting state with spinner
- Error states with descriptive messages
- Clean gray-and-orange themed UI inspired by mret.baby (minimal, clean, utility-focused) and capeify.com (bold typography, card-based sections, modern layout)

### Modify
- Nothing (new project)

### Remove
- Nothing (new project)

## Implementation Plan

### Backend
- Minimal backend only (no heavy logic needed -- conversion is done client-side via the public ezconv API)
- No backend components needed

### Frontend
- Single-page app
- Header with site name/logo
- Hero section: large heading, subheading about the converter
- Main converter card:
  - YouTube URL text input
  - Format toggle (MP3 / MP4)
  - MP3 quality dropdown (64k, 128k, 192k, 256k, 320k) shown when MP3 selected
  - Convert button (orange)
  - States: idle, loading/converting (spinner + message), success (show title + download button + "Convert Next"), error (show message + retry)
- API: POST to https://ds[1-3].ezsrv.net/api/convert with { url, quality, trim: false, startT: 0, endT: 0 }
  - For MP4: use https://ezmp4.cc API equivalent or direct download link from response
  - Load balance randomly between ds1, ds2, ds3
- How-to section (3 steps: paste link, choose format, download)
- Footer with site name
- Color theme: background #2a2a2a (dark gray), surface cards #333333, buttons/accents #f97316 (orange), text white/light gray
- Font: Inter or similar clean sans-serif
- Responsive layout (mobile + desktop)
