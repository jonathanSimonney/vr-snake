let initialPlayerRotation;
const numberApples = 2;
const appleAppearanceZone = {
    x: [-20, 20],
    y: [5, 35],
    z: [5, 45],
}
let score = 0;
let isPaused = true;

AFRAME.registerComponent('always-moving', {
    schema: {
        speed: {type: 'float', default: 0.05}, // Décalage sur l'axe (step)
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
    document.querySelector('#player').removeAttribute('always-moving')
    document.querySelector('#legend a-text').setAttribute('value', 'you lost. your score is of ' + score)
    document.querySelector('#legend').setAttribute('visible', true)
}

function eatApple(eatenApple) {
    score++
    // document.querySelector('a-scene').removeChild(event.detail.el)
    eatenApple.setAttribute("color", "#b413d8")
    eatenApple.setAttribute("class", "beganEating")

    // createApple()
}

function checkColision(event) {
    if (!event.detail.el){return;}
    // console.log(event)
    if ( event.detail.el.className == "beganEating" || event.detail.el.className == "beganDigesting"){return;}
    if (event.detail.el.className == "apple") {
        eatApple(event.detail.el)
    } else {
        looseGame(event)
    }
}

function convertApple(event){
    return function(){
        let snakeBodyPart = event.detail.el;
        console.log("hit just ended", event)

        // we remove the queue from the current last element
        const queueTracker = document.querySelector('#queue')
        const precedentLast = document.querySelector('.last')
        precedentLast.removeChild(queueTracker)

        // console.log(snakeBodyPart.getAttribute("count-ticks"));
        let tickDelay = snakeBodyPart.getAttribute("count-ticks").ticksNumber;
        snakeBodyPart.removeAttribute("count-ticks")
        console.log("the tick delay is of ", tickDelay)

        //todo make the new body part follow the precedent last elem, BEFORE removing the last class. See if component should be a follow-elem (applied on new queue),
        //todo or a track-following (applied on precedent last)

        precedentLast.setAttribute("class", "snake body-snake")//thus removing the last class

        //we convert the apple
        // snakeBodyPart.setAttribute("queue", true)
        snakeBodyPart.setAttribute("class", "snake body-snake last")
        snakeBodyPart.setAttribute("color", "#21db0d")

        //append the queue tracker to the "new" end of the snake
        snakeBodyPart.appendChild(queueTracker)
        // durationPath = 100 * document.querySelectorAll('a-curve a-curve-point').length //todo see best way to have a correct duration path, as tick are a measurement of game, not of time
        // snakeBodyPart.setAttribute("alongpath", "curve: #pathFollowed; rotation: true; duration: " + durationPath + ";")

        //add a new apple
        createApple()
    }
}

AFRAME.registerComponent('click-pause', {
    init: function () {
        this.el.addEventListener('click', () => {
            isPaused = !isPaused
            document.querySelector('#pausedIndic').setAttribute('visible', isPaused)
        })
    }
})

AFRAME.registerComponent('colision', {
    init: function () {
        this.el.addEventListener('hit', checkColision)
        // this.el.addEventListener('hitend', convertApple)
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
                // console.log(self.elMin, self.elMAx, elMin, elMax)
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

AFRAME.registerComponent('start-game-on-click', {
    init: function () {
        this.el.addEventListener('click', startGame)
    }
})

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

    createApple(2);

    Array.prototype.slice.call(document.querySelectorAll('.wall')).forEach(wall => {
        wall.setAttribute('aabb-collider', 'objects:#head;')
    })

    document.querySelector('#player').setAttribute('always-moving', true)
    document.querySelector('#queue').setAttribute('queue', true)
    document.querySelector('#legend').setAttribute('visible', false)
    document.querySelector('#legend').removeAttribute('start-game-on-click')
    document.querySelector('#legend').removeEventListener('click', startGame)
}
