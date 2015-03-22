# js-gaming

## Important

* This is an unstable branch, if you wan the stable branch go to https://github.com/airandfingers/js-gaming

## How to run it

1. download/install [node.js](http://nodejs.org/)
1. install dependencies: `npm install`
1. run it: `npm start`
1. open http://localhost:3000/temp in a browser

## Basic Flow

* Users Login
* User makes a match request
* Match Maker finds compatible players
* Match Maker Notifies Player and The games child process of a new match
* The players open up a new tab or iframe to join the match
* The child process waits for all players to join the match
* Once all players enter and are initialized, the match emits a "start"
* The game does what it wants

