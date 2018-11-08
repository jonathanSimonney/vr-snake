AFRAME.registerComponent('draw-path',  {
    schema: {
        numberFrame: {type: 'int', default: 100}, // number of frame before update
    },

    init: function(){
        // const foundNodes = document.querySelectorAll(this.data.selector)
        this.numberFrameDone = 0;
    },
    
    tick: function () {
        // console.log(isPaused, this.numberFrameDone);
        if (isPaused){return;}
        this.numberFrameDone++;
        if (this.numberFrameDone === this.data.numberFrame){
            // console.log("new point to the curve");
            this.numberFrameDone = 0;

            let newPointCurve = document.createElement("a-curve-point");

            newPointCurve.setAttribute("rotation", this.el.getAttribute("rotation"))
            newPointCurve.setAttribute("position", this.el.object3D.getWorldPosition())

            document.querySelector('#pathFollowed').appendChild(newPointCurve);
        }
    }
})