# FishLens

A field guide app for New York anglers. FishLens helps users identify fish, look up
species information and state fishing regulations, log their catches, and connect
with other anglers through following, groups, and competitions.

Built as a CSC 325 Software Engineering capstone project at Farmingdale State College.

**Live demo:** https://fish-lens-ruddy.vercel.app

## Requirements

See [spec.md](spec.md) for the full requirements, organized into six epics with
user stories and acceptance criteria. Work is tracked in the repo's Issues tab.

## Tech stack

- React + TypeScript
- Vite (development server and build tool)
- Deployed on Vercel

## Getting started

You'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org) (LTS version).

```bash
git clone https://github.com/carlosgonzal100/FishLens.git
cd FishLens
npm install
npm run dev
```

Then open http://localhost:8443 in your browser.

## Project structure

- `src/main.tsx`: entry point that starts the React app
- `src/App.tsx`: top-level component that decides which screen to show
- `src/screens/`: full pages (starter, sign in, register, dashboard)
- `src/components/`: reusable UI pieces
- `src/auth/`: account storage and session logic

## Current limitations

Accounts are currently stored in the browser's localStorage, so they only exist on
one device and browser. A backend with a shared database will be needed for features
that involve multiple users (following, groups, competitions).



## Attribution & Sources:
database from fishbase.org under Attribution-NonCommercial 4.0 https://creativecommons.org/licenses/by-nc/4.0/:

https://fishbase.org/country/CountryChecklist.php?what=list&trpp=50&c_code=840&csub_code=US-NY&cpresence=present&vhabitat=all2&ext_CL=on&ext_pic=on

New York State Fishing Regulations:

https://dec.ny.gov/things-to-do/freshwater-fishing/regulations

## Context Diagram

This is the system of our current workflow for our product FishLens: 

https://app.diagrams.net/#G1QbGMAqkn2zj-Kk2GKa9mPZfIvE18F7Yb#%7B%22pageId%22%3A%22cr7kqduUnIDSK3jMJ_eB%22%7D
