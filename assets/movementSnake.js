// AFRAME.registerComponent('draw-path',  {
//     schema: {
//         numberFrame: {type: 'int', default: 100}, // number of frame before update
//     },
//
//     init: function(){
//         // const foundNodes = document.querySelectorAll(this.data.selector)
//         this.numberFrameDone = 0;
//     },
//
//     tick: function () {
//         // console.log(isPaused, this.numberFrameDone);
//         if (isPaused){return;}
//         this.numberFrameDone++;
//         if (this.numberFrameDone === this.data.numberFrame){
//             // console.log("new point to the curve");
//             this.numberFrameDone = 0;
//
//             let newPointCurve = document.createElement("a-curve-point");
//
//             newPointCurve.setAttribute("rotation", this.el.getAttribute("rotation"))
//             newPointCurve.setAttribute("position", this.el.object3D.getWorldPosition())
//             newPointCurve.setAttribute('aabb-collider', 'objects:#queue')
//             // newPointCurve.addEventListener('alongpath-trigger-deactivated', suppressIfWasLast)
//
//             document.querySelector('#pathFollowed').appendChild(newPointCurve);
//         }
//     }
// })

// function suppressIfWasLast(event){
//     console.log(event);
// }

AFRAME.registerComponent('queue', {
    init: function () {
        this.el.setAttribute('aabb-collider', 'objects:.apple;')
        this.el.addEventListener('hitend', checkColisionEnd)
    }

})

function checkColisionEnd(event){
    if (!event.detail.el){return;}

    if (event.detail.el.className === "apple"){
        delayedEvents.push({'triggerTicks': 5, 'execute': convertApple(event), 'currentTickNumber': 0})
    }
}

function suppressCurvePoint(event){
    console.log("to be suppressed");
}