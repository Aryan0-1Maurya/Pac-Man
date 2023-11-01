/* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/

"use strict";
// alert('⚠ Still some glitches here and there ⚠\nMention anything weird you find');
msg1();
// alert((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 'Swipe in the direction you wanna move' : 'Use the arrow keys to move around');
function msg1() {
  Swal.fire(
    "⚠ Still some glitches here and there ⚠\nMention anything weird you find"
  );
  Swal.fire(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? "Swipe in the direction you wanna move"
      : "Use the arrow keys to move around"
  );
}
window.onload = function () {
  //why are you reading this? lol

  document.getElementById("page").style.transform =
    "scale(" +
    (window.screen.availWidth * 780 > window.screen.availHeight * 620
      ? window.screen.availHeight / 780
      : window.screen.availWidth / 620) +
    ")"; //resizes page to fit any screen
  //references to elements
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  let pacmanGraphic = document.getElementById("pacman");
  let inkyGraphic = document.getElementById("inky");
  let blinkyGraphic = document.getElementById("blinky");
  let pinkyGraphic = document.getElementById("pinky");
  let clydeGraphic = document.getElementById("clyde");
  let bonus = document.getElementById("cherry");
  let hud = document.getElementById("hud");

  //variables
  let timerRunning = false,
    framesElapsed = 0;
  let offsetTop = 42,
    offsetLeft = 2,
    overlap = 6,
    size = 22;
  let score = 0,
    level = 1,
    lives = 3,
    dotsEaten = 0,
    dotsCounter = 0,
    ghostsEaten = 0,
    dotsBeforeExit = [],
    sincePacmanLastAte = 0;
  let audioOn = true;
  let maze = new Array(31);
  for (let i = 0; i < 31; ++i) maze[i] = new Array(28); //creates empty array

  //classes
  //defines functions that run at given intervals
  class periodicFunction {
    constructor(method, max) {
      this.counter = 0;
      this.method = method;
      this.max = max;
      this.paused = false;
    }
  }

  //abstracts the web audio api
  function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
  }

  BufferLoader.prototype.loadBuffer = function (url, index) {
    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var loader = this;

    request.onload = function () {
      // Asynchronously decode the audio file data in request.response
      loader.context.decodeAudioData(
        request.response,
        function (buffer) {
          if (!buffer) {
            //  alert('error decoding file data: ' + url);
            error();
            return;
          }
          loader.bufferList[index] = buffer;
          if (++loader.loadCount == loader.urlList.length)
            loader.onload(loader.bufferList);
        },
        function (error) {
          console.error("decodeAudioData error", error);
        }
      );
    };

    request.onerror = function () {
      //alert('BufferLoader: XHR error');
      ErrorMsg();
    };

    request.send();
  };
  function error() {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "error decoding file data: " + url,
      footer:
        '<a href="https://amsrportfolio.netlify.app/contact">Why do I have this issue?</a>',
    });
  }
  BufferLoader.prototype.load = function () {
    for (var i = 0; i < this.urlList.length; ++i)
      this.loadBuffer(this.urlList[i], i);
  };
  function ErrorMsg() {
    Swal.fire({
      icon: "info",
      title: "BufferLoader: XHR error",
      showConfirmButton: false,
      timer: 1500,
    });
  }
  //defines sound objects
  class gameAudio {
    constructor(name, buffer, onend, startMuted) {
      this.name = name;
      this.buffer = buffer;
      this.startAudio = function (repeat) {
        this.source = context.createBufferSource();
        this.gainNode = context.createGain();
        this.source.buffer = this.buffer;
        this.source.connect(this.gainNode);
        this.gainNode.connect(context.destination);
        this.source.start(0);
        this.source.loop = repeat;
        this.source.onended = onend;
        if (startMuted) this.gainNode.gain.value = 0;
      };
      this.stopAudio = function () {
        this.source.stop(0);
      };
      this.setVolume = function (vol) {
        this.gainNode.gain.value = vol;
      };
    }
  }

  //defines the ghosts' attributes and decision making
  class ghost {
    constructor(name, dir, pos, target, dotsBeforeExit, setTarget) {
      this.name = name;
      this.dir = dir;
      this.pos = pos;
      this.speed = 5;
      this.target = target; //the tile that each ghost is trying to reach
      this.mode = "scatter";
      this.switchCounter = 1;
      this.switchTimeout = findSwitchTimeout(this.switchCounter, level);
      this.chaseOrRun = true;
      this.prevMode = "";
      this.frightenedModeCounter = 0; //360 frames, 9s
      this.frightenedModeTimeout = 360;
      this.stayInChaseMode = false;
      this.dotsBeforeExit = dotsBeforeExit;
      this.started = false;
      this.isMoving = false;
      this.reverseDir = false;
      this.setTarget = setTarget; //sets the target of each ghost from time to time
      let ghost = this;
      //there are 3 game modes - chase, scatter, and frightened mode
      //ghosts pursue pacman in chase mode, rush to their corners in scatter mode, and run away in frightened mode
      //the function below alternates between chase and scatter mode at given intervals
      this.switchModes = new periodicFunction(function () {
        ghost.chaseOrRun = true;
        if (ghost.switchCounter < 8) {
          //stops at the fourth chase mode
          if (ghost.mode != "invisible" && ghost.mode != "") {
            if (ghost.mode == "scatter") {
              ghost.mode = "chase";
            } else if (ghost.mode == "chase") {
              ghost.mode = "scatter";
            }
            ghost.reverseDir = true;
            ghost.switchCounter++;
            ghost.switchTimeout = findSwitchTimeout(ghost.switchCounter, level);
            this.max = ghost.switchTimeout;
          }
        }
      }, this.switchTimeout);
      this.frightened = function () {
        if (
          this.chaseOrRun == false &&
          this.mode != "invisible" &&
          this.mode != ""
        ) {
          if (this.frightenedModeCounter == 0) {
            this.chaseOrRun = false;
            if (this.mode != "frightened") this.prevMode = this.mode;
            this.mode = "frightened";
            this.switchModes.paused = true;
            this.frightenedModeCounter++;
            this.reverseDir = true;
            applyColorScheme(this.name, "blue"); //makes the ghost blue when frightened
          } else if (
            this.frightenedModeCounter > 0 &&
            this.frightenedModeCounter < this.frightenedModeTimeout
          ) {
            this.frightenedModeCounter++;
          } else {
            this.chaseOrRun = true;
            this.mode = this.prevMode;
            if (!this.stayInChaseMode) this.switchModes.paused = false;
            this.frightenedModeCounter = 0;
            applyColorScheme(this.name, "normal"); //makes the ghost change its color back to normal
            if (this.mode == "invisible") applyColorScheme(this.name, "eyes");
          }
          //makes ghosts flash red when they're about to be dangerous again
          switch (this.frightenedModeCounter) {
            case 280:
            case 300:
            case 320:
            case 340:
              applyColorScheme(this.name, "flash red");
              break;
            case 290:
            case 310:
            case 330:
            case 350:
              applyColorScheme(this.name, "flash blue");
              break;
          }
        }
      };
      //guides each ghost out the house
      this.findWayOut = new periodicFunction(function () {
        if (ghost.started == true) {
          if (ghost.pos.x == 14 && ghost.pos.y == 11) {
            ghost.isMoving = true;
            this.paused = true;
          } else if (ghost.pos.x == 14 && ghost.pos.y > 11) {
            ghost.pos.y--;
          } else if (ghost.pos.x < 14 && ghost.pos.y == 14) {
            ghost.pos.x++;
          } else if (ghost.pos.x > 14 && ghost.pos.y == 14) {
            ghost.pos.x--;
          }
          document.documentElement.style.setProperty(
            "--" + ghost.name + "Transition",
            "0.125s"
          );
          updateGhostGraphic(ghost);
        }
      }, 5);

      /* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/

      //moves the ghosts through the maze
      this.moveGhost = new periodicFunction(function () {
        if (ghost.isMoving) {
          if (
            document.getElementById(ghost.name).style.backgroundColor ==
            "transparent"
          ) {
            //error handling. Updates the ghost's target if he's lost when rushing back to the house
            ghost.mode = "invisible";
            ghost.target.x = 14;
            ghost.target.y = 11;
          }
          if (
            ghost.pos.y == 14 &&
            ((ghost.pos.x > 0 && ghost.pos.x <= 5) ||
              (ghost.pos.x < 27 && ghost.pos.x >= 22))
          ) {
            ghost.speed = 10;
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0.25s"
            );
          } else if (
            ghost.pos.y == 14 &&
            (ghost.pos.x == 0 || ghost.pos.x == 27)
          ) {
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0s"
            );
          } else {
            if (ghost.mode == "frightened") {
              ghost.speed = 8;
              document.documentElement.style.setProperty(
                "--" + ghost.name + "Transition",
                "0.2s"
              );
            } else if (ghost.mode == "chase" || ghost.mode == "scatter") {
              ghost.speed = 5;
              document.documentElement.style.setProperty(
                "--" + ghost.name + "Transition",
                "0.125s"
              );
            } else if (ghost.mode == "invisible") {
              ghost.speed = 2;
              document.documentElement.style.setProperty(
                "--" + ghost.name + "Transition",
                "0.05s"
              );
            }
          }
          if (ghost.pos.x == 0 && ghost.pos.y == 14 && ghost.dir == "left") {
            //makes it possible for ghosts to go through the left tunnel
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0s"
            ); //makes the ghost disappear into nowhere
            ghost.pos.x = 26; //and come back through the right tunnel
          } else if (
            ghost.pos.x == 27 &&
            ghost.pos.y == 14 &&
            ghost.dir == "right"
          ) {
            //makes it possible for ghosts to go through the right tunnel
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0s"
            );
            ghost.pos.x = 1;
          } else {
            //find out what direction the ghost has decided to take after moving to the next tile
            let next = pathFinder(ghost, ghost.chaseOrRun);
            //meanwhile, move the ghost in his current direction
            if (
              maze[ghost.pos.y + convertDir(ghost.dir).y][
                ghost.pos.x + convertDir(ghost.dir).x
              ] != 0
            ) {
              ghost.pos.y += convertDir(ghost.dir).y;
              ghost.pos.x += convertDir(ghost.dir).x;
              //now that the ghost has moved, update his direction based on what he had decided earlier
              ghost.dir = next;
            } else {
              //error handling. Makes the ghost pick any free tile if he's stuck
              if (maze[ghost.pos.y - 1][ghost.pos.x] != 0) {
                ghost.dir = "up";
                ghost.dir = pathFinder(ghost, ghost.chaseOrRun); //just to clear any doubts, this makes perfect sense
                //this is because pathFinder() uses the current direction
                //so we need to update it prior to calling the function
                ghost.pos.y--;
              } else if (maze[ghost.pos.y][ghost.pos.x - 1] != 0) {
                ghost.dir = "left";
                ghost.dir = pathFinder(ghost, ghost.chaseOrRun);
                ghost.pos.x--;
              } else if (maze[ghost.pos.y + 1][ghost.pos.x] != 0) {
                ghost.dir = "down";
                ghost.dir = pathFinder(ghost, ghost.chaseOrRun);
                ghost.pos.y++;
              } else if (maze[ghost.pos.y][ghost.pos.x + 1] != 0) {
                ghost.dir = "right";
                ghost.dir = pathFinder(ghost, ghost.chaseOrRun);
                ghost.pos.x++;
              }
            }
          }
          //update the ghost's graphic on screen
          updateGhostGraphic(ghost);
          //update the ghost's speed
          this.max = ghost.speed;
        }
      }, 5);
      //checks collision between ghosts and pacman
      this.collide = function () {
        if (this.pos.x == pacman.pos.x && this.pos.y == pacman.pos.y) {
          if (this.mode == "frightened") {
            timerRunning = false;
            ghostsEaten++;
            applyColorScheme(this.name, "transparent");
            score += 100 * Math.pow(2, ghostsEaten);
            document.getElementById(this.name + "Score").innerText =
              100 * Math.pow(2, ghostsEaten);
            document.documentElement.style.setProperty(
              "--pacmanColor",
              "transparent"
            );
            siren.setVolume(0);
            invincible.setVolume(0);
            regenerating.setVolume(0);
            eatGhost.startAudio(false);
            setTimeout(function () {
              timerRunning = true;
              applyColorScheme(ghost.name, "eyes");
              document.getElementById(ghost.name + "Score").innerText = "";
              document.documentElement.style.setProperty(
                "--pacmanColor",
                "#FFFD38"
              );
            }, 1000);
            this.prevMode = "invisible";
            this.stayInChaseMode = true;
            this.frightenedModeCounter = this.frightenedModeTimeout;
          }
          if (this.mode == "chase" || this.mode == "scatter") {
            timerRunning = false;
            audioOn = false;
            siren.setVolume(0);
            invincible.setVolume(0);
            regenerating.setVolume(0);
            playerDeath.startAudio(false);
            applyColorScheme(this.name, "transparent");
            pacmanGraphic.style.transform = "scale(0)";
            lives--;
            if (lives == 2) {
              document.documentElement.style.setProperty(
                "--life2",
                "transparent"
              );
            } else if (lives == 1) {
              document.documentElement.style.setProperty(
                "--life1",
                "transparent"
              );
            }
            setTimeout(function () {
              applyColorScheme(ghost.name, "normal");
              died();
            }, 2000);
          }
        }
      };
      //makes the ghost head for its place in the house
      this.getBackIn = function () {
        if (this.pos.x == 14 && this.pos.y == 11 && this.mode == "invisible") {
          this.mode = "";
          this.moveGhost.paused = true;
          this.findWayIn.paused = false;
        }
      };
      //guides each ghost into the house
      this.findWayIn = new periodicFunction(function () {
        if (ghost.name == "blinky" || ghost.name == "pinky") {
          if (ghost.pos.y < 14) {
            ghost.pos.y++;
          } else if (ghost.pos.y == 14) {
            applyColorScheme(ghost.name, "normal");
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0.125s"
            );
            ghost.isMoving = false;
            ghost.started = true;
            ghost.mode = "chase";
            ghost.findWayOut.paused = false;
            ghost.moveGhost.paused = false;
            ghost.findWayIn.paused = true;
          }
        } else if (ghost.name == "inky") {
          if (ghost.pos.y < 14) {
            ghost.pos.y++;
          } else if (ghost.pos.y == 14 && ghost.pos.x > 12) {
            ghost.pos.x--;
          } else if (ghost.pos.y == 14 && ghost.pos.x == 12) {
            applyColorScheme(ghost.name, "normal");
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0.125s"
            );
            ghost.isMoving = false;
            ghost.started = true;
            ghost.mode = "chase";
            ghost.findWayOut.paused = false;
            ghost.moveGhost.paused = false;
            ghost.findWayIn.paused = true;
          }
        } else if (ghost.name == "clyde") {
          if (ghost.pos.y < 14) {
            ghost.pos.y++;
          } else if (ghost.pos.y == 14 && ghost.pos.x < 16) {
            ghost.pos.x++;
          } else if (ghost.pos.y == 14 && ghost.pos.x == 16) {
            applyColorScheme(ghost.name, "normal");
            document.documentElement.style.setProperty(
              "--" + ghost.name + "Transition",
              "0.125s"
            );
            ghost.isMoving = false;
            ghost.started = true;
            ghost.mode = "chase";
            ghost.findWayOut.paused = false;
            ghost.moveGhost.paused = false;
            ghost.findWayIn.paused = true;
          }
        }
        updateGhostGraphic(ghost);
      }, 2);
      this.findWayIn.paused = true;
      //makes ghosts reverse
      this.reverse = function () {
        let opposite = "",
          straightPath =
            (maze[this.pos.y + 1][this.pos.x] != 0 &&
              maze[this.pos.y - 1][this.pos.x] != 0 &&
              maze[this.pos.y][this.pos.x + 1] == 0 &&
              maze[this.pos.y + 1][this.pos.x + 1] == 0 &&
              maze[this.pos.y - 1][this.pos.x + 1] == 0 &&
              maze[this.pos.y][this.pos.x - 1] == 0 &&
              maze[this.pos.y + 1][this.pos.x - 1] == 0 &&
              maze[this.pos.y - 1][this.pos.x - 1] == 0) ||
            (maze[this.pos.y + 1][this.pos.x] == 0 &&
              maze[this.pos.y + 1][this.pos.x - 1] == 0 &&
              maze[this.pos.y + 1][this.pos.x + 1] == 0 &&
              maze[this.pos.y - 1][this.pos.x] == 0 &&
              maze[this.pos.y - 1][this.pos.x - 1] == 0 &&
              maze[this.pos.y - 1][this.pos.x + 1] == 0 &&
              maze[this.pos.y][this.pos.x + 1] != 0 &&
              maze[this.pos.y][this.pos.x - 1] != 0);
        switch (this.dir) {
          case "left":
            opposite = "right";
            break;
          case "up":
            opposite = "down";
            break;
          case "right":
            opposite = "left";
            break;
          case "down":
            opposite = "up";
            break;
        }
        if (this.reverseDir && straightPath) {
          //waits for the ghost to enter a straight path before attempting to reverse. Trying this on junctions brought nasty bugs that I was unable to track :(
          this.dir = opposite;
          this.reverseDir = false;
        }
      };
    }
  }

  //object(s)
  let pacman = {
    pos: { x: 14, y: 23 },
    dir: "right",
    isMoving: true,
  };

  let blinky = new ghost(
    "blinky",
    "right",
    { x: 14, y: 11 },
    { x: 25, y: -2 },
    0,
    function () {
      //blinky pursues pacman directly. He still goes after pacman in all scatter modes except the first one
      if (this.switchCounter == 1 && this.mode == "scatter") {
        this.target.x = 25;
        this.target.y = -2;
      } else {
        if (
          this.mode == "chase" ||
          this.mode == "scatter" ||
          this.mode == "frightened"
        ) {
          this.target.x = pacman.pos.x;
          this.target.y = pacman.pos.y;
        } else if (this.mode == "invisible") {
          this.target.x = 14;
          this.target.y = 11;
        }
      }
    }
  );

  let pinky = new ghost(
    "pinky",
    "left",
    { x: 14, y: 14 },
    { x: 2, y: -2 },
    0,
    function () {
      //pinky tries to ambush pacman from the front
      if (this.mode == "chase" || this.mode == "frightened") {
        this.target.x = pacman.pos.x + 4 * convertDir(pacman.dir).x;
        this.target.y = pacman.pos.y + 4 * convertDir(pacman.dir).y;
      } else if (this.mode == "scatter") {
        this.target.x = 2;
        this.target.y = -2;
      } else if (this.mode == "invisible") {
        this.target.x = 14;
        this.target.y = 11;
      }
    }
  );

  let inky = new ghost(
    "inky",
    "right",
    { x: 12, y: 14 },
    { x: 27, y: 33 },
    30,
    function () {
      //inky stays around blinky and pacman
      if (this.mode == "chase" || this.mode == "frightened") {
        this.target.x =
          blinky.pos.x +
          (pacman.pos.x + 2 * convertDir(pacman.dir).x - blinky.pos.x) * 2;
        this.target.y =
          blinky.pos.y +
          (pacman.pos.y + 2 * convertDir(pacman.dir).y - blinky.pos.y) * 2;
      } else if (this.mode == "scatter") {
        this.target.x = 27;
        this.target.y = 33;
      } else if (this.mode == "invisible") {
        this.target.x = 14;
        this.target.y = 11;
      }
    }
  );

  let clyde = new ghost(
    "clyde",
    "left",
    { x: 16, y: 14 },
    { x: 0, y: 33 },
    30,
    function () {
      //clyde only chases pacman when he is more than eight tiles away
      if (this.mode == "chase" || this.mode == "frightened") {
        if (
          Math.abs(pacman.pos.x - this.pos.x) > 8 ||
          Math.abs(pacman.pos.y - this.pos.y) > 8
        ) {
          this.target.x = pacman.pos.x;
          this.target.y = pacman.pos.y;
        } else {
          this.target.x = 0;
          this.target.y = 33;
        }
      } else if (this.mode == "scatter") {
        this.target.x = 0;
        this.target.y = 33;
      } else if (this.mode == "invisible") {
        this.target.x = 14;
        this.target.y = 11;
      }
    }
  );

  //loads audio buffers
  var context, bufferLoader;
  function init() {
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();

    bufferLoader = new BufferLoader(
      context,
      [
        "https://badasstechie.github.io/Clips/Intro.mp3",
        "https://badasstechie.github.io/Clips/Cutscene.mp3",
        "https://badasstechie.github.io/Clips/Siren.mp3",
        "https://badasstechie.github.io/Clips/Invincible.mp3",
        "https://badasstechie.github.io/Clips/Regenerating.mp3",
        "https://badasstechie.github.io/Clips/Eat%20Dots.mp3",
        "https://badasstechie.github.io/Clips/Eat%20Ghost.mp3",
        "https://badasstechie.github.io/Clips/Player%20Death.mp3",
      ],
      finishedLoading
    );

    bufferLoader.load();
  }
  init();

  //runs once audio has been loaded and decoded
  let intro,
    newGame,
    siren,
    invincible,
    regenerating,
    eatDots,
    eatGhost,
    playerDeath; //sounds
  function finishedLoading(bufferList) {
    hud.innerText = "READY!";
    //initializes audio
    intro = new gameAudio(
      "intro",
      bufferList[0],
      function () {
        hud.innerText = "";
        document.documentElement.style.setProperty("--pacmanAnimation", "0.2s");
        timerRunning = true;
        siren.startAudio(true);
        invincible.startAudio(true);
        regenerating.startAudio(true);
      },
      false
    );
    newGame = new gameAudio(
      "cutscene",
      bufferList[1],
      function () {
        hud.innerText = "";
        document.documentElement.style.setProperty("--pacmanAnimation", "0.2s");
        timerRunning = true;
        audioOn = true;
      },
      false
    );
    siren = new gameAudio("siren", bufferList[2], null, false);
    invincible = new gameAudio("invincible", bufferList[3], null, true);
    regenerating = new gameAudio("regenerating", bufferList[4], null, true);
    eatDots = new gameAudio("eatDots", bufferList[5], null, false);
    eatGhost = new gameAudio("eatGhost", bufferList[6], null, false);
    playerDeath = new gameAudio("playerDeath", bufferList[7], null, false);
    intro.startAudio(false);
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      //iOS fix
      hud.innerText = "";
      document.documentElement.style.setProperty("--pacmanAnimation", "0.2s");
      timerRunning = true;
      siren.startAudio(true);
      invincible.startAudio(true);
      regenerating.startAudio(true);
    }
  }

  //initializes the maze
  function initArray() {
    let x = 0,
      y = 0;
    [
      ..."0000000000000000000000000000022222222222200222222222222002000020000020020000020000200300002000002002000002000030020000200000200200000200002002222222222222222222222222200200002002000000002002000020020000200200000000200200002002222220022220022220022222200000002000001001000002000000000000200000100100000200000000000020011111111110020000000000002001000000001002000000000000200101111110100200000011111121110111111011121111110000002001011111101002000000000000200100000000100200000000000020011111111110020000000000002001000000001002000000000000200100000000100200000002222222222220022222222222200200002000002002000002000020020000200000200200000200002003220022222221122222220022300002002002000000002002002000000200200200000000200200200002222220022220022220022222200200000000002002000000000020020000000000200200000000002002222222222222222222222222200000000000000000000000000000",
    ].forEach((char) => {
      maze[y][x] = parseInt(char);
      x++;
      if (x == maze[y].length) {
        y++;
        x = 0;
      }
    });
    //the array divides the maze into rows and columns
    //0 means the area is not available, 1 represents regions pacman can go through
    //2 and 3 represent the smaller and larger dots
  }
  initArray();

  //draws the dots represented in the array on the canvas
  function drawDots() {
    for (let y = 0; y < 31; ++y) {
      for (let x = 0; x < 28; ++x) {
        if (maze[y][x] == 2) {
          ctx.beginPath();
          ctx.fillStyle = "#FAAFD6";
          ctx.fillRect(size * x + 9, size * y + 9, 5, 5);
          ctx.closePath();
        }
        if (maze[y][x] == 3) {
          ctx.beginPath();
          ctx.arc(size * x + 11, size * y + 11, 9, 0, 2 * Math.PI);
          ctx.fillStyle = "#FAAFD6";
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  }
  drawDots();

  /* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/

  //makes the larger dots blink
  let colorOfDots = "#000";
  let flashDots = new periodicFunction(function () {
    if (colorOfDots == "#000") {
      colorOfDots = "#FAAFD6";
    } else {
      colorOfDots = "#000";
    }
    for (let y = 0; y < 31; ++y) {
      for (let x = 0; x < 28; ++x) {
        if (maze[y][x] == 3) {
          ctx.beginPath();
          ctx.arc(size * x + 11, size * y + 11, 9, 0, 2 * Math.PI);
          ctx.fillStyle = colorOfDots;
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  }, 10);
  flashDots.counter = flashDots.max - 1;

  //removes eaten dots and fruits then adds to the score
  let timeout = null,
    currentFrame = 0;
  function updateDots() {
    if (maze[pacman.pos.y][pacman.pos.x] == 2) {
      score += 10;
      dotsEaten++;
      dotsCounter++;
      if (dotsEaten % 2) eatDots.startAudio(false);
      if (dotsEaten == 70 || dotsEaten == 170) currentFrame = framesElapsed; //ensures fruits are added only twice
      sincePacmanLastAte = 0;
      maze[pacman.pos.y][pacman.pos.x] = 1;
      ctx.beginPath();
      ctx.fillStyle = "#000";
      ctx.fillRect(size * pacman.pos.x + 9, size * pacman.pos.y + 9, 5, 5);
      ctx.closePath();
    } else if (maze[pacman.pos.y][pacman.pos.x] == 3) {
      //makes ghosts run away in fear
      if (blinky.mode != "invisible" || blinky.mode != "") {
        blinky.chaseOrRun = false;
        blinky.frightenedModeCounter = 0;
      }
      if (inky.mode != "invisible" || blinky.mode != "") {
        inky.chaseOrRun = false;
        inky.frightenedModeCounter = 0;
      }
      if (pinky.mode != "invisible" || blinky.mode != "") {
        pinky.chaseOrRun = false;
        pinky.frightenedModeCounter = 0;
      }
      if (clyde.mode != "invisible" || blinky.mode != "") {
        clyde.chaseOrRun = false;
        clyde.frightenedModeCounter = 0;
      }
      score += 50;
      dotsEaten++;
      dotsCounter++;
      ghostsEaten = 0;
      if (dotsEaten % 2) eatDots.startAudio(false);
      if (dotsEaten == 70 || dotsEaten == 170) currentFrame = framesElapsed; //ensures fruits are added only twice
      sincePacmanLastAte = 0;
      maze[pacman.pos.y][pacman.pos.x] = 1;
      ctx.beginPath();
      ctx.arc(
        size * pacman.pos.x + 11,
        size * pacman.pos.y + 11,
        9,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.closePath();
    } else {
      sincePacmanLastAte++;
    }
    if (dotsCounter == 244) {
      //increases the level when the maze is cleared
      levelUp();
    }
    if (framesElapsed == currentFrame) {
      if (dotsEaten == 70 || dotsEaten == 170) {
        //adds bonus fruits when pacman eats 70 or 170 dots
        bonus.style.top = "410px";
        bonus.style.left = "304px";
        timeout = setTimeout(function () {
          //makes them disappear after 9 seconds
          bonus.style.top = "730px";
          bonus.style.left = "580px";
        }, 9000);
      }
    }
    if (
      pacman.pos.x == 14 &&
      pacman.pos.y == 17 &&
      bonus.style.top == "410px" &&
      bonus.style.left == "304px" &&
      timeout != null
    ) {
      //increases score by 100 when pacman eats the cherries
      clearTimeout(timeout);
      timeout = null;
      bonus.style.top = "730px";
      bonus.style.left = "580px";
      score += 100;
      document.getElementById("bonusScore").innerText = "100"; //shows score for eating the fruit briefly
      setTimeout(function () {
        document.getElementById("bonusScore").innerText = "";
      }, 1500);
    }
  }

  //updates the score on screen
  function drawScore() {
    document.getElementById("score").innerText = score.toString();
  }

  //moves pacman
  let movePlayer = new periodicFunction(function () {
    //an object with a function and its counter
    document.documentElement.style.setProperty("--pacmanTransition", "0.125s");
    if (pacman.pos.x == 0 && (pacman.pos.y == 14) & (pacman.dir == "left")) {
      //makes it possible for pacman to go through the left tunnel
      pacman.isMoving = true;
      document.documentElement.style.setProperty("--pacmanTransition", "0s"); //makes pacman disappear into nowhere
      pacman.pos.x = 26; //and come back through the right tunnel
    } else if (
      pacman.pos.x == 27 &&
      (pacman.pos.y == 14) & (pacman.dir == "right")
    ) {
      //makes it possible for pacman to go through the right tunnel
      pacman.isMoving = true;
      document.documentElement.style.setProperty("--pacmanTransition", "0s");
      pacman.pos.x = 1;
    } else {
      if (
        maze[pacman.pos.y + convertDir(pacman.dir).y][
          pacman.pos.x + convertDir(pacman.dir).x
        ] != 0
      ) {
        //checks if a path lies ahead
        //makes pacman move into any free space ahead of him
        pacman.isMoving = true;
        pacman.pos.y += convertDir(pacman.dir).y;
        pacman.pos.x += convertDir(pacman.dir).x;
      } else {
        pacman.isMoving = false;
        //checks if the user has slightly missed the path
        quantize(1);
        quantize(-1);
      }
    }
    //updates elements on screen
    pacmanGraphic.style.left =
      offsetLeft + pacman.pos.x * size - overlap + "px";
    pacmanGraphic.style.top = offsetTop + pacman.pos.y * size - overlap + "px";
    if (pacman.isMoving) {
      //animates pacman's mouth when he's moving
      document.documentElement.style.setProperty("--pacmanAnimation", "0.2s");
    } else {
      //pauses the animation when he's not moving
      document.documentElement.style.setProperty("--pacmanAnimation", "0s");
    }
  }, 5);
  movePlayer.counter = movePlayer.max - 1;

  //snaps pacman to the nearest path ahead when he's just beside it
  //this makes pacman move into adjacent paths even when the user hasn't taken a precise turn
  function quantize(leftOrRight) {
    let x = 0,
      y = 0,
      delta = 1;
    switch (pacman.dir) {
      case "left":
        x = -1;
        y = 0 - leftOrRight;
        delta = -1;
        break;
      case "up":
        x = leftOrRight;
        y = -1;
        break;
      case "right":
        x = 1;
        y = leftOrRight;
        break;
      case "down":
        x = 0 - leftOrRight;
        y = 1;
        delta = -1;
        break;
    }
    //if the user has just missed the path
    if (maze[pacman.pos.y + y][pacman.pos.x + x] != 0) {
      //changes the axis and makes pacman turn
      if (pacman.dir == "left" || pacman.dir == "right") {
        pacman.pos.y += delta * leftOrRight;
      } else if (pacman.dir == "up" || pacman.dir == "down") {
        pacman.pos.x += delta * leftOrRight;
      }
    }
  }

  //updates the direction pacman is facing on screen
  function refreshDir(dir) {
    switch (dir) {
      case "left":
        document.getElementById("upperHalf").className = "left1";
        document.getElementById("lowerHalf").className = "left2";
        break;
      case "up":
        document.getElementById("upperHalf").className = "up1";
        document.getElementById("lowerHalf").className = "up2";
        break;
      case "right":
        document.getElementById("upperHalf").className = "right1";
        document.getElementById("lowerHalf").className = "right2";
        break;
      case "down":
        document.getElementById("upperHalf").className = "down1";
        document.getElementById("lowerHalf").className = "down2";
        break;
    }
  }

  //returns the timeout for alternating between chase and scatter mode. columns represent the levels
  function findSwitchTimeout(count, level) {
    let options = [
      [7, 7, 7, 7, 5],
      [20, 20, 20, 20, 20],
      [7, 7, 7, 7, 5],
      [20, 20, 20, 20, 20],
      [5, 5, 5, 5, 5],
      [20, 1033, 1033, 1033, 1033],
      [5, 0.05, 0.05, 0.05, 0.05],
      [0, 0, 0, 0, 0],
    ];
    return options[count - 1][(level > 5 ? 5 : level) - 1] / 0.025; //from level 5 onwards all intervals are equal
  }

  //expresses directions as change in X and Y axes
  function convertDir(dir) {
    let x = 0,
      y = 0;
    switch (dir) {
      case "left":
        x = -1;
        break;
      case "up":
        y = -1;
        break;
      case "right":
        x = 1;
        break;
      case "down":
        y = 1;
        break;
    }
    return { x: x, y: y };
  }

  //releases each ghost once his time has come
  let prev = 0;
  function exitHouse() {
    if (dotsEaten == blinky.dotsBeforeExit && blinky.started == false) {
      blinky.started = true;
      prev = dotsEaten;
    }
    if (dotsEaten - prev == pinky.dotsBeforeExit && pinky.started == false) {
      document.documentElement.style.setProperty("--pinkyAnimation", "0s");
      pinky.started = true;
      prev = dotsEaten;
    }
    if (dotsEaten - prev == inky.dotsBeforeExit && inky.started == false) {
      document.documentElement.style.setProperty("--inkyAnimation", "0s");
      inky.started = true;
      prev = dotsEaten;
    }
    if (dotsEaten - prev == clyde.dotsBeforeExit && clyde.started == false) {
      document.documentElement.style.setProperty("--clydeAnimation", "0s");
      clyde.started = true;
      prev = dotsEaten;
    }
    if (sincePacmanLastAte != 0 && sincePacmanLastAte % 160 == 0) {
      if (pinky.started == false) {
        document.documentElement.style.setProperty("--pinkyAnimation", "0s");
        pinky.started = true;
        prev = dotsEaten;
      } else if (inky.started == false) {
        document.documentElement.style.setProperty("--inkyAnimation", "0s");
        inky.started = true;
        prev = dotsEaten;
      } else if (clyde.started == false) {
        document.documentElement.style.setProperty("--clydeAnimation", "0s");
        clyde.started = true;
        prev = dotsEaten;
      }
    }
  }

  //this heuristic guides ghosts to their respective targets
  //it chooses the path each ghost shall take upon moving into a junction
  function pathFinder(ghost, minOrMax) {
    let up, left, down, right, dir, notAnOption;
    notAnOption = minOrMax ? Math.pow(2, 53) : 0;
    switch (ghost.dir) {
      //finds the distance between each viable option and the target
      case "up":
        up =
          maze[ghost.pos.y - 2][ghost.pos.x] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - ghost.pos.x, 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y - 2), 2)
              );
        left =
          maze[ghost.pos.y - 1][ghost.pos.x - 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x - 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y - 1), 2)
              );
        down = notAnOption;
        right =
          maze[ghost.pos.y - 1][ghost.pos.x + 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x + 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y - 1), 2)
              );
        break;
      case "left":
        up =
          (ghost.pos.x - 1 == 12 && (ghost.pos.y == 11 || ghost.pos.y == 23)) ||
          (ghost.pos.x - 1 == 15 && (ghost.pos.y == 11 || ghost.pos.y == 23))
            ? notAnOption
            : maze[ghost.pos.y - 1][ghost.pos.x - 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x - 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y - 1), 2)
              );
        left =
          maze[ghost.pos.y][ghost.pos.x - 2] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x - 2), 2) +
                  Math.pow(ghost.target.y - ghost.pos.y, 2)
              );
        down =
          maze[ghost.pos.y + 1][ghost.pos.x - 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x - 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y + 1), 2)
              );
        right = notAnOption;
        break;
      case "down":
        up = notAnOption;
        left =
          maze[ghost.pos.y + 1][ghost.pos.x - 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x - 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y + 1), 2)
              );
        down =
          maze[ghost.pos.y + 2][ghost.pos.x] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - ghost.pos.x, 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y + 2), 2)
              );
        right =
          maze[ghost.pos.y + 1][ghost.pos.x + 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x + 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y + 1), 2)
              );
        break;
      case "right":
        up =
          (ghost.pos.x + 1 == 12 && (ghost.pos.y == 11 || ghost.pos.y == 23)) ||
          (ghost.pos.x + 1 == 15 && (ghost.pos.y == 11 || ghost.pos.y == 23))
            ? notAnOption
            : maze[ghost.pos.y - 1][ghost.pos.x + 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x + 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y - 1), 2)
              );
        left = notAnOption;
        down =
          maze[ghost.pos.y + 1][ghost.pos.x + 1] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x + 1), 2) +
                  Math.pow(ghost.target.y - (ghost.pos.y + 1), 2)
              );
        right =
          maze[ghost.pos.y][ghost.pos.x + 2] == 0
            ? notAnOption
            : Math.sqrt(
                Math.pow(ghost.target.x - (ghost.pos.x + 2), 2) +
                  Math.pow(ghost.target.y - ghost.pos.y, 2)
              );
        break;
    }
    //picks the path with the shortest or the longest distance to its target, depending on the argument provided
    dir = "up";
    if (minOrMax) {
      let min = up;
      if (left < min) {
        min = left;
        dir = "left";
      }
      if (down < min) {
        min = down;
        dir = "down";
      }
      if (right < min) {
        min = right;
        dir = "right";
      }
    } else {
      let max = up;
      if (left >= max) {
        max = left;
        dir = "left";
      }
      if (down >= max) {
        max = down;
        dir = "down";
      }
      if (right >= max) {
        max = right;
        dir = "right";
      }
    }
    return dir;
  }

  /* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/

  //updates the ghost's graphic on screen
  function updateGhostGraphic(ghost) {
    //moves the ghost to new tiles
    switch (ghost.name) {
      case "inky":
        inkyGraphic.style.left =
          offsetLeft + ghost.pos.x * size - overlap + "px";
        inkyGraphic.style.top = offsetTop + ghost.pos.y * size - overlap + "px";
        break;
      case "blinky":
        blinkyGraphic.style.left =
          offsetLeft + ghost.pos.x * size - overlap + "px";
        blinkyGraphic.style.top =
          offsetTop + ghost.pos.y * size - overlap + "px";
        break;
      case "pinky":
        pinkyGraphic.style.left =
          offsetLeft + ghost.pos.x * size - overlap + "px";
        pinkyGraphic.style.top =
          offsetTop + ghost.pos.y * size - overlap + "px";
        break;
      case "clyde":
        clydeGraphic.style.left =
          offsetLeft + ghost.pos.x * size - overlap + "px";
        clydeGraphic.style.top =
          offsetTop + ghost.pos.y * size - overlap + "px";
        break;
    }
    //makes the ghost's eyes look the direction he's moving
    document.getElementById(ghost.name + ".leftEye").style.top = "25%";
    document.getElementById(ghost.name + ".rightEye").style.top = "25%";
    document.getElementById(ghost.name + ".leftEye").style.left = "25%";
    document.getElementById(ghost.name + ".rightEye").style.left = "25%";
    if (ghost.mode != "frightened") {
      switch (ghost.dir) {
        case "up":
          document.getElementById(ghost.name + ".leftEye").style.top = "0%";
          document.getElementById(ghost.name + ".rightEye").style.top = "0%";
          break;
        case "left":
          document.getElementById(ghost.name + ".leftEye").style.left = "0%";
          document.getElementById(ghost.name + ".rightEye").style.left = "0%";
          break;
        case "down":
          document.getElementById(ghost.name + ".leftEye").style.top = "50%";
          document.getElementById(ghost.name + ".rightEye").style.top = "50%";
          break;
        case "right":
          document.getElementById(ghost.name + ".leftEye").style.left = "50%";
          document.getElementById(ghost.name + ".rightEye").style.left = "50%";
          break;
      }
    }
  }

  //changes the ghosts' colors
  function applyColorScheme(ghostName, color) {
    switch (color) {
      case "blue":
        document.getElementById(ghostName).style.backgroundColor = "#0B24FB";
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "#FFF";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "#FFF";
        document.getElementById(
          ghostName + ".leftEyeball"
        ).style.backgroundColor = "transparent";
        document.getElementById(
          ghostName + ".rightEyeball"
        ).style.backgroundColor = "transparent";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "#FFF";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "#FFF";
        break;
      case "normal":
        document.getElementById(ghostName).style.backgroundColor =
          getComputedStyle(document.documentElement).getPropertyValue(
            "--" + ghostName + "Color"
          );
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "#305198";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "#305198";
        document.getElementById(
          ghostName + ".leftEyeball"
        ).style.backgroundColor = "#FFF";
        document.getElementById(
          ghostName + ".rightEyeball"
        ).style.backgroundColor = "#FFF";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "transparent";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "transparent";
        break;
      case "eyes":
        document.getElementById(ghostName).style.backgroundColor =
          "transparent";
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "#305198";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "#305198";
        document.getElementById(
          ghostName + ".leftEyeball"
        ).style.backgroundColor = "#FFF";
        document.getElementById(
          ghostName + ".rightEyeball"
        ).style.backgroundColor = "#FFF";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "transparent";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "transparent";
        break;
      case "transparent":
        document.getElementById(ghostName).style.backgroundColor =
          "transparent";
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "transparent";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "transparent";
        document.getElementById(
          ghostName + ".leftEyeball"
        ).style.backgroundColor = "transparent";
        document.getElementById(
          ghostName + ".rightEyeball"
        ).style.backgroundColor = "transparent";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "transparent";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "transparent";
        break;
      case "flash red":
        document.getElementById(ghostName).style.backgroundColor = "#FFF";
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "#FE2502";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "#FE2502";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "#FE2502";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "#FE2502";
        break;
      case "flash blue":
        document.getElementById(ghostName).style.backgroundColor = "#0B24FB";
        document.getElementById(ghostName + ".leftEye").style.backgroundColor =
          "#FFF";
        document.getElementById(ghostName + ".rightEye").style.backgroundColor =
          "#FFF";
        document.getElementById(ghostName + ".mouth").style.borderColor =
          "#FFF";
        document.getElementById(ghostName + ".mouth1").style.borderColor =
          "#FFF";
        break;
    }
  }

  //runs when Pac-Man dies
  function died() {
    if (lives == 0) {
      document.documentElement.style.setProperty("--blinkyAnimation", "0s");
      document.documentElement.style.setProperty("--pinkyAnimation", "0s");
      document.documentElement.style.setProperty("--inkyAnimation", "0s");
      document.documentElement.style.setProperty("--clydeAnimation", "0s");
      document.documentElement.style.setProperty("--ghostsWalking", "0s");
      hud.style.color = "#FE2502";
      hud.innerText = "GAME OVER";
      siren.stopAudio();
      invincible.stopAudio();
      regenerating.stopAudio();
    } else {
      dotsBeforeExit = [
        [0, 0, 0],
        [7, 7, 7],
        [10, 10, 10],
        [15, 15, 15],
      ];
      pacmanGraphic.style.transform = "scale(1)";
      initialize();
    }
  }

  //runs when user levels up
  function levelUp() {
    level += 1;
    dotsCounter = 0;
    dotsBeforeExit = [
      [0, 0, 0],
      [0, 0, 0],
      [30, 0, 0],
      [30, 50, 0],
    ];
    document.getElementById("level").innerText = "LVL" + level;
    initArray();
    drawDots();
    initialize();
  }

  //updates game audio
  function updateAudio() {
    if (audioOn) {
      if (
        blinky.mode == "invisible" ||
        pinky.mode == "invisible" ||
        inky.mode == "invisible" ||
        clyde.mode == "invisible"
      ) {
        siren.setVolume(0);
        invincible.setVolume(0);
        regenerating.setVolume(1);
      } else if (
        blinky.mode == "frightened" ||
        pinky.mode == "frightened" ||
        inky.mode == "frightened" ||
        clyde.mode == "frightened"
      ) {
        siren.setVolume(0);
        invincible.setVolume(1);
        regenerating.setVolume(0);
      } else {
        siren.setVolume(1);
        invincible.setVolume(0);
        regenerating.setVolume(0);
      }
    }
  }

  //initializes the game
  function initialize() {
    audioOn = false;
    applyColorScheme("inky", "normal");
    applyColorScheme("blinky", "normal");
    applyColorScheme("pinky", "normal");
    applyColorScheme("clyde", "normal");
    document.documentElement.style.setProperty("--blinkyTransition", "0s");
    document.documentElement.style.setProperty("--pinkyTransition", "0s");
    document.documentElement.style.setProperty("--inkyTransition", "0s");
    document.documentElement.style.setProperty("--clydeTransition", "0s");
    document.documentElement.style.setProperty("--pacmanTransition", "0s");
    framesElapsed = 0;
    dotsEaten = 0;
    sincePacmanLastAte = 0;
    prev = 0;
    if (timeout != null) clearTimeout(timeout);
    bonus.style.top = "730px";
    bonus.style.left = "580px";
    timeout = null;
    currentFrame = 0;
    pacman = {
      pos: { x: 14, y: 23 },
      dir: "right",
      isMoving: true,
    };
    pacmanGraphic.style.left =
      offsetLeft + pacman.pos.x * size - overlap + "px";
    pacmanGraphic.style.top = offsetTop + pacman.pos.y * size - overlap + "px";
    refreshDir(pacman.dir);
    blinky = new ghost(
      "blinky",
      "right",
      { x: 14, y: 11 },
      { x: 25, y: -2 },
      dotsBeforeExit[0][(level > 3 ? 3 : level) - 1],
      function () {
        if (this.switchCounter == 1 && this.mode == "scatter") {
          this.target.x = 25;
          this.target.y = -2;
        } else {
          if (
            this.mode == "chase" ||
            this.mode == "scatter" ||
            this.mode == "frightened"
          ) {
            this.target.x = pacman.pos.x;
            this.target.y = pacman.pos.y;
          } else if (this.mode == "invisible") {
            this.target.x = 14;
            this.target.y = 11;
          }
        }
      }
    );
    updateGhostGraphic(blinky);
    pinky = new ghost(
      "pinky",
      "left",
      { x: 14, y: 14 },
      { x: 2, y: -2 },
      dotsBeforeExit[1][(level > 3 ? 3 : level) - 1],
      function () {
        if (this.mode == "chase" || this.mode == "frightened") {
          this.target.x = pacman.pos.x + 4 * convertDir(pacman.dir).x;
          this.target.y = pacman.pos.y + 4 * convertDir(pacman.dir).y;
        } else if (this.mode == "scatter") {
          this.target.x = 2;
          this.target.y = -2;
        } else if (this.mode == "invisible") {
          this.target.x = 14;
          this.target.y = 11;
        }
      }
    );
    updateGhostGraphic(pinky);
    inky = new ghost(
      "inky",
      "right",
      { x: 12, y: 14 },
      { x: 27, y: 33 },
      dotsBeforeExit[2][(level > 3 ? 3 : level) - 1],
      function () {
        if (this.mode == "chase" || this.mode == "frightened") {
          this.target.x =
            blinky.pos.x +
            (pacman.pos.x + 2 * convertDir(pacman.dir).x - blinky.pos.x) * 2;
          this.target.y =
            blinky.pos.y +
            (pacman.pos.y + 2 * convertDir(pacman.dir).y - blinky.pos.y) * 2;
        } else if (this.mode == "scatter") {
          this.target.x = 27;
          this.target.y = 33;
        } else if (this.mode == "invisible") {
          this.target.x = 14;
          this.target.y = 11;
        }
      }
    );
    updateGhostGraphic(inky);
    clyde = new ghost(
      "clyde",
      "left",
      { x: 16, y: 14 },
      { x: 0, y: 33 },
      dotsBeforeExit[3][(level > 3 ? 3 : level) - 1],
      function () {
        if (this.mode == "chase" || this.mode == "frightened") {
          if (
            Math.abs(pacman.pos.x - this.pos.x) > 8 ||
            Math.abs(pacman.pos.y - this.pos.y) > 8
          ) {
            this.target.x = pacman.pos.x;
            this.target.y = pacman.pos.y;
          } else {
            this.target.x = 0;
            this.target.y = 33;
          }
        } else if (this.mode == "scatter") {
          this.target.x = 0;
          this.target.y = 33;
        } else if (this.mode == "invisible") {
          this.target.x = 14;
          this.target.y = 11;
        }
      }
    );
    updateGhostGraphic(clyde);
    document.documentElement.style.setProperty("--blinkyAnimation", "0.4s");
    document.documentElement.style.setProperty("--pinkyAnimation", "0.4s");
    document.documentElement.style.setProperty("--inkyAnimation", "0.4s");
    document.documentElement.style.setProperty("--clydeAnimation", "0.4s");
    document.documentElement.style.setProperty("--pacmanAnimation", "0s");
    timerRunning = false;
    hud.innerText = "READY!";
    siren.setVolume(0);
    invincible.setVolume(0);
    regenerating.setVolume(0);
    newGame.startAudio(false);
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      //iOS fix
      hud.innerText = "";
      document.documentElement.style.setProperty("--pacmanAnimation", "0.2s");
      timerRunning = true;
      audioOn = true;
    }
  }

  //runs functions at various intervals
  function run(process) {
    if (process.paused == false) {
      process.counter++;
      if (process.counter == process.max) {
        process.method();
        process.counter = 0;
      }
    }
  }

  //animates the game while locking the frame rate
  let stop = false,
    frameCount = 0,
    fpsInterval,
    startTime,
    now,
    then,
    elapsed;
  startAnimating(40 /*fps*/);
  function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
  }
  function animate() {
    if (stop) {
      return;
    }
    requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;
    if (elapsed > fpsInterval) {
      then = now - (elapsed % fpsInterval);

      //runs on each frame
      if (timerRunning) {
        framesElapsed++;
        updateDots();
        run(movePlayer);
        run(flashDots);
        drawScore();
        run(blinky.switchModes);
        run(inky.switchModes);
        run(pinky.switchModes);
        run(clyde.switchModes);
        blinky.frightened();
        inky.frightened();
        pinky.frightened();
        clyde.frightened();
        blinky.reverse();
        inky.reverse();
        pinky.reverse();
        clyde.reverse();
        run(blinky.findWayOut);
        run(inky.findWayOut);
        run(pinky.findWayOut);
        run(clyde.findWayOut);
        run(blinky.moveGhost);
        run(inky.moveGhost);
        run(pinky.moveGhost);
        run(clyde.moveGhost);
        blinky.setTarget();
        pinky.setTarget();
        inky.setTarget();
        clyde.setTarget();
        blinky.collide();
        pinky.collide();
        inky.collide();
        clyde.collide();
        blinky.getBackIn();
        pinky.getBackIn();
        inky.getBackIn();
        clyde.getBackIn();
        run(blinky.findWayIn);
        run(inky.findWayIn);
        run(pinky.findWayIn);
        run(clyde.findWayIn);
        exitHouse();
        updateAudio();
      }
      //******************
    }
  }

  //event listener(s)
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("touchstart", handleTouchStart, false);
  document.addEventListener("touchmove", handleTouchMove, false);

  //event handler(s)
  //arrow keys(computer)
  function keyDownHandler(e) {
    switch (e.keyCode) {
      case 37:
        pacman.dir = "left";
        break;
      case 38:
        pacman.dir = "up";
        break;
      case 39:
        pacman.dir = "right";
        break;
      case 40:
        pacman.dir = "down";
        break;
    }
    refreshDir(pacman.dir);
  }

  //swipe(mobile)
  let xDown = null;
  let yDown = null;
  function getTouches(evt) {
    return evt.touches || evt.originalEvent.touches;
  }
  function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
  }
  function handleTouchMove(evt) {
    if (!xDown || !yDown) {
      return;
    }
    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;
    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 0) {
        pacman.dir = "left";
      } else {
        pacman.dir = "right";
      }
    } else {
      if (yDiff > 0) {
        pacman.dir = "up";
      } else {
        pacman.dir = "down";
      }
    }
    refreshDir(pacman.dir);
    xDown = null;
    yDown = null;
  }
};

/* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/
