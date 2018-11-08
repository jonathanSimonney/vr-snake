let initialPlayerRotation;
const numberApples = 2;
const appleAppearanceZone = {
    x: [-20, 20],
    y: [5, 35],
    z: [5, 45],
}
let apples = []

AFRAME.registerComponent('always-moving', {
    schema: {
        speed: {type: 'float', default: 0.05}, // Décalage sur l'axe (step)
    },

    init: function(){
        initialPlayerRotation = this.el.getAttribute("rotation");
    },



    tick: function () {
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
    document.querySelector('#player a-text').setAttribute('value', 'you lost. your score is of ???')
    document.querySelector('#player a-text').setAttribute('visible', true)
}

AFRAME.registerComponent('crash-on-wall', {
    init: function () {
        this.el.addEventListener('hit', looseGame)
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
                el.emit('hitend');
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
        if (apples.length < numberApples + 1) {
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
    
            apples.push({
                x: randomX,
                y: randomY,
                z: randomZ
            })
    
            scene.append(apple);
        }
    }
}

function startGame(){
    console.log("start the game!")

    createApple(2);

    Array.prototype.slice.call(document.querySelectorAll('.wall')).forEach(wall => {
        wall.setAttribute('aabb-collider', 'objects:#head;')
    })

    Array.prototype.slice.call(document.querySelectorAll('.apple')).forEach(apple => {
        apple.setAttribute('aabb-collider', 'objects:#head;')
    })

    document.querySelector('#player').setAttribute('always-moving', true)
    document.querySelector('#player a-text').setAttribute('visible', false)
    document.querySelector('#player a-text').removeAttribute('start-game-on-click')
}
