(function() {
    var ElevatorManager, elevatorManager;

    /// Initial configuration - change values in order to examin different variations
    const FLOORS = 5;
    const ELEVATORS = 3;
    const BUILDINGS = 2;



    ElevatorManager = class ElevatorManager {

        constructor() {
            let buildings, floor, me;
            this.queue = [];
            me = this;


            //Initail elevator configuration per building
            this.elevators = (() => {
                var arr = new Array();
                for (var k = 0; k < BUILDINGS; k++) {
                    arr.push([]);
                    for (var i = 1; i <= ELEVATORS; i++) {
                        arr[k].push({ building: k, floor: 0, moving: false });
                    }
                }
                return arr;
            })();

            //Render buidings, floors and buttons according to settings (FLOORS, ELEVATORS, BUILDINGS)
            var buildingWidth = 200 + (ELEVATORS + 1) * 50;
            buildings = (() => {
                var j, results;
                results = [];
                for (var i = 0; i < BUILDINGS; i++) {
                    results.push(`<div id='building-${i}' class='building' style='width:${buildingWidth}px'>`);

                    results.push(`<div id='building-buttons-${i}'>`);
                    for (floor = j = FLOORS; j >= 0; floor = j += -1) {
                        results.push(`<div id = 'building-${i}-button-floor-${floor}' data-building=${i} class='floor'>\n  <button class="metal linear" >${floor}</button><p id='building-${i}-clock-floor-${floor}' class='countDownClock' ></p>\n</div><div class="blackline"></div>`);
                    }
                    results.push(`</div>`);

                    results.push(`<div id="building-elevators-${i}">`);

                    for (var k = 1; k <= ELEVATORS; k++) {
                        results.push(`<div id='elevator${k}' class='elevatorshaft'>`);
                        results.push(`<div class='elevator'>`);
                        results.push(`<div>`);
                        for (floor = j = FLOORS; j >= 0; floor = j += -1) {
                            results.push(`<div class="floorHeight"></div>`);
                        }
                        results.push(`</div></div></div>`);
                    }

                    results.push(`</div></div>`);
                }
            return results;
            })().join("");

            $("#buildings").empty().append($(buildings));

            //handler for click event of the floor button
            $(":button").on("click", function() {
                if ($(this).hasClass("on")) {
                    return;
                }
                $(this).toggleClass("on");

                return $(me).trigger("pressed", [
                {
                    building: $(this).parent().attr("data-building"),
                    floor: parseInt($(this)[0].textContent)
                }
                ]);
            });
        }

          //Clear button active style after elevator arrived to the floor
        clearButton(building, floor) {
            return $(`#building-${building}-button-floor-${floor} > button `).removeClass("on");
        }

          //Find the closest idle elevator 
          //Creates a list of none moving elevators and find the closest one.
        closestIdleElevator(building, floor) {
            let a, elevator, closest, i, lowest, nonmoving;
            console.log(`Building: ${building}, Finding closest elevator to ${floor} from `, this.elevators[building] );

            //Create the list of idle elevators
            nonmoving = (()=> {
                let j, len, ref, results;
                ref = this.elevators;
                results = [];
                for (i = j = 0, len = ref[building].length; j < len; i = ++j) {
                    elevator = ref[building][i];
                    if (!elevator.moving) {
                        results.push([i + 1, Math.abs(floor - elevator.floor)]);
                    }
                }
                return results;
            }).call(this);

            if (nonmoving.length == 0) {
                return -1;
            }

            //find the closest gap between the idel elevators and the requested floor
            closest = nonmoving.reduce(function(a, b) {
                if (a[1] <= b[1]) {
                     return a;
                } else {
                    return b;
                }
            });

            //create a list of the elevators that has the sam gap as closest
            lowest = (()=> {
                let j, len, results;
                results = [];
                for (j = 0, len = nonmoving.length; j < len; j++) {
                    a = nonmoving[j];
                    if (a[1] === closest[1]) {
                        results.push(a[0]);
                    }
                }
                return results;
            })();
            console.log(`Closest elevator to ${floor} is ${closest} from ${nonmoving}`);
            //Select elevator randomaly the from the list of closest idle elevators
            return lowest[Math.floor(Math.random() * lowest.length)];
        }

          //Move the elevator of the relevant building
        moveElevator(building, elevator, floor) {
            let deferred, mElevators;
            mElevators = this.elevators;
            let self = this;
            deferred = $.Deferred();
            if (mElevators[building][elevator - 1].moving) {
                return deferred.reject();
            }
            if (floor < 0 || floor > FLOORS) {
                return deferred.reject();
            }
            mElevators[building][elevator - 1].moving = true;

            //Show countdown till the elevator arrived to requested floor
            this.runCountDown(building, mElevators[building][elevator - 1].floor, floor);

            $(`#building-elevators-${building}`).find(`#elevator${elevator} .elevator`).animate(
                {
                bottom: `${floor * 110}px`
                },
                {
                    duration: 500 * Math.abs(mElevators[building][elevator - 1].floor - floor),
                    easing: "swing",
                    complete: function() {
                        mElevators[building][elevator - 1].floor = floor;
                        console.log(` %%%%  elevator: ${elevator - 1} complete`);
                        setTimeout(function () {
                            mElevators[building][elevator - 1].moving = false;
                            console.log( `  @@@ elevator: ${elevator - 1} is on move: ${ mElevators[building][elevator - 1].moving }` );
                            self.checkQueue();
                        }, 2000);

                        let audio = new Audio("./ding.mp3");
                        audio.play();

                        return deferred.resolve();
                    }.bind(self)
                }
            ).delay(75);

     
    
            return deferred;
        }

          //Show countdown in seconds till the elevators arrives to requested floor
        runCountDown(building, elevatorFloor, targetFloor) {
            let distance = Math.abs(targetFloor - elevatorFloor);
            let seconds = Math.floor(distance / 2);

            let controlId = `#building-${building}-clock-floor-` + targetFloor;
            $(controlId).show();
            $(controlId).text(seconds + "s ");
            let x = setInterval(function() {
                $(controlId).text(seconds-- + "s ");
                if (seconds < 0) {
                    setTimeout(function () {
                        $(controlId).hide();
                    }, 2000);
                clearInterval(x);
                }
            }, 800);
        }

          //Check if the queue contains elevators calls that needs to be addressed
        checkQueue() {
            if (this.queue.length > 0) {
                var self = this;

                var floor = this.queue[0].floor;
                var building = this.queue[0].building;

                var elevator = this.closestIdleElevator(building, floor);
                console.log(`Closest elevator to ${floor} is: ${elevator} `);
                if (elevator >= 0) {
                    this.queue.shift();
                    return this.moveElevator(building, elevator, floor).then((()=> {
                        return self.clearButton(building, floor);
                    }).bind(self));
                }
            }
        }
    };

    elevatorManager = new ElevatorManager();

    $(elevatorManager).on("pressed", function(e, { building, floor }) {
    console.log(`Pressed floor: ${floor} building: ${building}`);

        elevatorManager.queue.push({ building, floor });
        elevatorManager.checkQueue();
    });

    //elevatorManager.moveElevator(1, 3);
}.call(this));
