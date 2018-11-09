let isFirstAppleEaten = false;
let snakeTickLength = 0;
// AFRAME.registerComponent('queue', {
//     init: function () {
//         this.el.setAttribute('aabb-collider', 'objects:.apple;')
//         this.el.addEventListener('hit', beginCountingTick)
//         this.el.addEventListener('hitend', checkColisionEnd)
//     }
//
// })

function checkColisionEnd(event){
    if (!event.detail.el){return;}

    // console.log(event.detail.el.className);

    if (event.detail.el.className === "apple beganEating"){
        let delay = 0
        if (!isFirstAppleEaten){
            delay = 10
            isFirstAppleEaten = true;
        }

        tickDelay = event.detail.el.getAttribute("count-ticks").ticksNumber;
        event.detail.el.removeAttribute("count-ticks")
        delay += tickDelay;

        snakeTickLength += delay

        delayedEvents.push({'triggerTicks': snakeTickLength, 'execute': convertApple(event, delay), 'currentTickNumber': 0})
    }
}

AFRAME.registerComponent('follow-permanently', {
    registerCheckpoint(){
        this.data.numberTicks = 0
        let checkPointPosition = this.data.followedElement.object3D.getWorldPosition()
        let checkPointRotation = this.data.followedElement.object3D.getWorldRotation()

        const currentPosition = this.el.getAttribute("position")
        const currentRotation = this.el.getAttribute("rotation")

        this.data.deltaPosition = {
            x: (checkPointPosition.x - currentPosition.x) / this.data.spaceTicks,
            y: (checkPointPosition.y - currentPosition.y) / this.data.spaceTicks,
            z: (checkPointPosition.z - currentPosition.z) / this.data.spaceTicks,
        }
        this.data.deltaRotation = {
            x: (checkPointRotation._x - currentRotation.x) / this.data.spaceTicks,
            y: (checkPointRotation._y - currentRotation.y) / this.data.spaceTicks,
            z: (checkPointRotation._z - currentRotation.z) / this.data.spaceTicks,
        }
    },

    updatePositionAndRotation(){
        let element = this.el

        const currentPosition = element.getAttribute("position")
        const currentRotation = element.getAttribute("rotation")
        const deltaPosition = this.data.deltaPosition
        const deltaRotation = this.data.deltaRotation

        let newPosition = {
            x: currentPosition.x + deltaPosition.x,
            y: currentPosition.y + deltaPosition.y,
            z: currentPosition.z + deltaPosition.z,
        }

        let newRotation = {
            x: currentRotation.x + deltaRotation.x,
            y: currentRotation.y + deltaRotation.y,
            z: currentRotation.z + deltaRotation.z,
        }

        element.setAttribute("position", newPosition)
        element.setAttribute("rotation", newRotation)
    },

    schema: {
        spaceTicks: {type: 'int'}, // number of ticks to go to the element place
        followedSelector: {type: 'string'}, // querySelector to choose which element will be followed
    },

    init: function(){
        this.data.followedElement = document.querySelector(this.data.followedSelector)
        this.registerCheckpoint()
    },

    tick: function(){
        if (isPaused && gameStarted){return;}
        this.data.numberTicks++;
        this.updatePositionAndRotation()
        if (this.data.numberTicks === this.data.spaceTicks){
            this.registerCheckpoint()
        }
    }
})
