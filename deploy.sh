#!/bin/bash
ssh -A "$SERVER" "
    cd  $DIR
    git checkout master
    git pull --rebase
    pm2 restart fps-game
    "