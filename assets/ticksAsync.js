delayedEvents = []; //array of event with a tick before they should be triggered

//iterate over delayedEvents to trigger the needed ones
function checkForEvents(){
    delayedEvents.forEach((singleDelayedEvent, index, object) => {
        singleDelayedEvent.currentTickNumber++
        if (singleDelayedEvent.currentTickNumber === singleDelayedEvent.triggerTicks){
            singleDelayedEvent.execute();
            object.splice(index, 1)
        }
    })
}

AFRAME.registerComponent('count-ticks', {
    init: function () {
        this.data.ticksNumber = 0;
    },

    tick: function () {
        if (isPaused){return}
        this.data.ticksNumber++;
    }
})