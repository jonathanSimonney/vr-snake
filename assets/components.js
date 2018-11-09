let initialPlayerRotation;
const numberApples = 2;
const appleAppearanceZone = {
    x: [-20, 20],
    y: [5, 35],
    z: [5, 45],
}
let score = 0;
let isPaused = false;
let gameStarted = false;
var eatsound = new Audio('assets/eatsound.ogg');
var diesound = new Audio('assets/diesound.ogg');
var music = new Audio('assets/music.mp3')
music.loop = true;
music.volume = 0.05
eatsound.volume = 1


AFRAME.registerComponent('always-moving', {
    schema: {
        speed: {type: 'float', default: 0.09}, // Décalage sur l'axe (step)
    },

    init: function(){
        initialPlayerRotation = this.el.getAttribute("rotation");
    },



    tick: function () {
        if (isPaused){return;}

        checkForEvents();

        const cameraRotation = document.querySelector('#camera').getAttribute("rotation")

        const rxDecalage = cameraRotation.x
        const ryDecalage = cameraRotation.y
        // rzDecalage = cameraRotation.z

        const rx = initialPlayerRotation.x + rxDecalage
        const ry = initialPlayerRotation.y + ryDecalage
        //const rz = initialPlayerRotation.z + rzDecalage

        var currentPos = this.el.getAttribute('position'); //Position actuelle de l'objet a déplacer

        const newPosition = {
            x: currentPos.x + this.data.speed * Math.sin((ry - 180) * Math.PI / 180.0), //Nouvelle valeur pour la position x
            y: currentPos.y + this.data.speed * Math.sin(rx * (Math.PI / 180.0)), //Nouvelle valeur pour la position y
            z: currentPos.z + this.data.speed * Math.cos((ry - 180) * Math.PI / 180.0), //Nouvelle valeur pour la postion z
        };

        // console.log(currentPos, newPosition)

        this.el.setAttribute('position', newPosition);
    }
});

function looseGame(event){
    console.log("the game is lost");
    gameStarted = false;
    document.querySelector('#player').removeAttribute('always-moving')
    document.querySelector('#legend').setAttribute('value', 'You lost. Your score is of ' + score)
    document.querySelector('#legend').setAttribute('visible', true)
    music.pause()
    music.currentTime = 0
    diesound.play();
}

function eatApple(eatenApple) {
    eatsound.play();
    score++
    document.querySelector('#score').setAttribute('value', score)
    eatenApple.setAttribute("color", "#b413d8")
    eatenApple.setAttribute("class", "apple beganEating")

    createApple()
}

function checkColision(event) {
    if (!event.detail.el){return;}
    // console.log(event)
    if ( event.detail.el.className == "apple beganEating" || event.detail.el.className == "apple beganDigesting"){return;}
    if (event.detail.el.className == "apple") {
        eatApple(event.detail.el)
    } else if (gameStarted) {
        looseGame(event)
    }
}

function convertApple(event){
    return function(){
        let snakeBodyPart = event.detail.el;

        // we remove the queue from the current last element
        const queueTracker = document.querySelector('#queue')
        const precedentLast = document.querySelector('.last')
        precedentLast.removeChild(queueTracker)

        // console.log(snakeBodyPart.getAttribute("count-ticks").ticksNumber);
        let tickDelay = snakeBodyPart.getAttribute("count-ticks").ticksNumber;
        snakeBodyPart.removeAttribute("count-ticks")
        console.log("the tick delay is of ", tickDelay)

        snakeBodyPart.setAttribute("follow-permanently", "spaceTicks: " + tickDelay + ";" + "followedSelector: .last;")

        precedentLast.setAttribute("class", "snake body-snake")//thus removing the last class

        //we convert the apple
        snakeBodyPart.setAttribute("class", "snake body-snake last")
        snakeBodyPart.setAttribute("color", "#21db0d")

        //append the queue tracker to the "new" end of the snake
        snakeBodyPart.appendChild(queueTracker)
    }
}

AFRAME.registerComponent('click-pause', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (gameStarted) {
                isPaused = !isPaused
                document.querySelector('#legend').setAttribute('visible', isPaused)
                document.querySelector('#legend').setAttribute('value', "Game is paused")
            }
        })
    }
})

AFRAME.registerComponent('colision', {
    init: function () {
        this.el.addEventListener('hit', checkColision)
    }
})

/**
 * Implement AABB collision detection for entities with a mesh.
 * (https://en.wikipedia.org/wiki/Minimum_bounding_box#Axis-aligned_minimum_bounding_box)
 * It sets the specified state on the intersected entities.
 *
 * @property {string} objects - Selector of the entities to test for collision.
 * @property {string} state - State to set on collided entities.
 *
 */
AFRAME.registerComponent('aabb-collider', {
    schema: {
        objects: {default: ''},
        state: {default: 'collided'}
    },

    init: function () {
        this.els = [];
        this.collisions = [];
        this.elMax = new THREE.Vector3();
        this.elMin = new THREE.Vector3();
    },

    /**
     * Update list of entities to test for collision.
     */
    update: function () {
        var data = this.data;
        var objectEls;

        // Push entities into list of els to intersect.
        if (data.objects) {
            objectEls = this.el.sceneEl.querySelectorAll(data.objects);
        } else {
            // If objects not defined, intersect with everything.
            objectEls = this.el.sceneEl.children;
        }
        // Convert from NodeList to Array
        this.els = Array.prototype.slice.call(objectEls);
    },

    tick: (function () {
        var boundingBox = new THREE.Box3();
        return function () {
            var collisions = [];
            var el = this.el;
            var mesh = el.getObject3D('mesh');
            var self = this;
            // No mesh, no collisions
            if (!mesh) { return; }
            // Update the bounding box to account for rotations and
            // position changes.
            updateBoundingBox();
            // Update collisions.
            this.els.forEach(intersect);
            // Emit events.
            collisions.forEach(handleHit);
            // No collisions.
            if (collisions.length === 0) { self.el.emit('hit', {el: null}); }
            // Updated the state of the elements that are not intersected anymore.
            this.collisions.filter(function (el) {
                return collisions.indexOf(el) === -1;
            }).forEach(function removeState (el) {
                el.removeState(self.data.state);
                el.emit('hitend', {el: self.el});
                self.el.emit('hitend', {el: el});
            });
            // Store new collisions
            this.collisions = collisions;

            // AABB collision detection
            function intersect (el) {
                var intersected;
                var mesh = el.getObject3D('mesh');
                var elMin;
                var elMax;
                if (!mesh) { return; }
                boundingBox.setFromObject(mesh);
                elMin = boundingBox.min;
                elMax = boundingBox.max;
                // Bounding boxes are always aligned with the world coordinate system.
                // The collision test checks for the conditions where cubes intersect.
                // It's an extension to 3 dimensions of this approach (with the condition negated)
                // https://www.youtube.com/watch?v=ghqD3e37R7E
                intersected = (self.elMin.x <= elMax.x && self.elMax.x >= elMin.x) &&
                    (self.elMin.y <= elMax.y && self.elMax.y >= elMin.y) &&
                    (self.elMin.z <= elMax.z && self.elMax.z >= elMin.z);
                if (!intersected) { return; }
                collisions.push(el);
            }

            function handleHit (hitEl) {
                hitEl.emit('hit', {el: self.el});
                hitEl.addState(self.data.state);
                self.el.emit('hit', {el: hitEl});
            }

            function updateBoundingBox () {
                boundingBox.setFromObject(mesh);
                self.elMin.copy(boundingBox.min);
                self.elMax.copy(boundingBox.max);
            }
        };
    })()
});

function createApple(n = 1) {
    for (i = 0; i < n; i++) {
        const randomX = Math.floor(Math.random() * (appleAppearanceZone.x[1] - appleAppearanceZone.x[0] +1)) + appleAppearanceZone.x[0];
        const randomY = Math.floor(Math.random() * (appleAppearanceZone.y[1] - appleAppearanceZone.y[0] +1)) + appleAppearanceZone.y[0];
        const randomZ = Math.floor(Math.random() * (appleAppearanceZone.z[1] - appleAppearanceZone.z[0] +1)) + appleAppearanceZone.z[0];

        let scene = document.querySelector("a-scene")
        let apple = document.createElement("a-box")

        apple.setAttribute('position', randomX + " " + randomY + " " + randomZ)
        apple.setAttribute('depth', '1')
        apple.setAttribute('width', '1')
        apple.setAttribute('height', '1')
        apple.setAttribute('class', 'apple')
        apple.setAttribute('color', 'red')
        apple.setAttribute('aabb-collider', 'objects:#head;')


        scene.append(apple);
    }
}

function startGame(){
    console.log("start the game!")

    music.play()

    createApple(2);
    gameStarted = true;

    Array.prototype.slice.call(document.querySelectorAll('.wall')).forEach(wall => {
        wall.setAttribute('aabb-collider', 'objects:#head;')
    })

    document.querySelector('#player').setAttribute('always-moving', true)
    document.querySelector('#queue').setAttribute('queue', true)
    document.querySelector('#legend').setAttribute('visible', false)
    document.querySelector('#legend').removeAttribute('start-game-on-click')
    document.querySelector('#legend').removeEventListener('click', startGame)
}
window.onload = function() {
    document.querySelector('a-scene').addEventListener('enter-vr', function () {
        Array.prototype.slice.call(document.querySelectorAll('.wall')).forEach(wall => {
            wall.setAttribute('src', 'assets/wall.jpg');
        })
        document.querySelector('#legend').setAttribute('value', "The game will start soon")
        setTimeout(function() {
            startGame();
        }, 3000)
    });
}

