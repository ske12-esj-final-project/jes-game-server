#!/bin/bash
ssh -A "$SERVER" "
    cd  $DIR
    git checkout master
    git reset --hard origin/master
    git pull
    yarn
    pm2 restart fps-game
    "