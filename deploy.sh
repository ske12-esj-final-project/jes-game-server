#!/bin/bash
ssh -A "$SERVER" "
    cd  $DIR
    git checkout master
    git pull --rebase
    yarn
    pm2 restart fps-game
    "