# AI即時敗血症風險預測 Sepsis Risk

敗血症可能導致器官功能衰竭與危及生命。本頁籤會透過病患的生理監測資訊，預測是否有敗血症風險。此模型的特點是不需檢驗數值，僅使用生理監測數值進行預測。

## Medical Note · SMART on FHIR (Next.js)

Minimal SMART on FHIR demo built with **Next.js App Router**, **shadcn/ui (Radix)**, and **fhirclient**.  
Fetch Patient data from a SMART sandbox, record audio (Whisper), and generate GPT summaries.

> Status: WIP — interfaces and APIs may change.

---

## Features
- SMART on FHIR OAuth (PKCE): `/smart/launch` → `/smart/callback`
- Fetch **Patient** via `fhirclient` (`useSmartPatient` hook)
- Audio recording + Whisper transcription
- GPT-based summary generation
- API key input stored in browser (session/local storage)

---

## Prerequisites
- Node **18.18+** or **20.x LTS**
- npm / pnpm / yarn (examples use npm)

---

## Install & Run

```bash
# install deps
npm i

# development (webpack — recommended for this repo)
npm run dev:webpack

# production build
npm run build

# start production server
npm start
```

---
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:webpack": "next dev",
    "build": "next build --turbopack",
    "start": "next start"
  }
}
```
Use `npm run dev:webpack` during development. Turbopack scripts are available if you want to try them.

---

## Use with SMART Sandbox

1. Start dev server: http://localhost:3000

2. In the SMART App Launcher (or your sandbox app registration), set:

   - Launch URL: http://localhost:3000/smart/launch
   - Redirect URL: http://localhost:3000/smart/callback
   - Client Type: Public (PKCE)
   - Client ID: my_web_app (or your registered ID)
   - Scopes: launch openid fhirUser patient/*.read online_access

3. Launch → complete auth → redirected back to the app → Patient info loads on the home page.

Don’t refresh /smart/callback directly; always start from /smart/launch.

## Development Team
- 孫英洲：團隊主持人
- 郭宜欣：核心程式提供
- 黃凱辰：本專案開發
- 詹彥杰：技術支援

## Demo (SMART on FHIR)
- SMART Launcher:  
https://launch.smarthealthit.org/
- App Demo Launch URL:  
https://launch.smarthealthit.org/?launch_url=https%3A%2F%2Fkaichen0712.github.io%2FSepsis_prediction_smartonfhir%2Fsmart%2Flaunch&launch=WzAsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0

## Credits
P.S. 本專案核心是使用郭宜欣醫師的「medical-note-smart-on-fhir」修改而成。  
原專案連結：https://github.com/voho0000/medical-note-smart-on-fhir/tree/master