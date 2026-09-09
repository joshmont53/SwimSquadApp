#!/bin/bash
set -e

npm install
npx tsx scripts/apply-development-migrations.ts
