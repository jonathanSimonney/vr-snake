AFRAME.registerComponent('queue', {
    init: function () {
        this.el.setAttribute('aabb-collider', 'objects:.apple;')
        this.el.addEventListener('hit', beginCountingTick)
        this.el.addEventListener('hitend', checkColisionEnd)
    }

})

function beginCountingTick(event){
    if (!event.detail.el){return;}

    if (event.detail.el.className === "beganEating"){
        event.detail.el.setAttribute("count-ticks", true)
        event.detail.el.setAttribute("class", "beganDigesting")
    }
}

function checkColisionEnd(event){
    if (!event.detail.el){return;}

    if (event.detail.el.className === "beganDigesting"){
        delayedEvents.push({'triggerTicks': 5, 'execute': convertApple(event), 'currentTickNumber': 0})
    }
}
