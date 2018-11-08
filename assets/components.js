let initialPlayerRotation;

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
            y: currentPos.y + this.data.speed * Math.tan((rx - 180) * (Math.PI / 180)), //Nouvelle valeur pour la postion y
            z: currentPos.z + this.data.speed * Math.cos((ry - 180) * Math.PI / 180.0), //Nouvelle valeur pour la postion z
        };

        // console.log(currentPos, newPosition)

        this.el.setAttribute('position', newPosition);
    }
});
