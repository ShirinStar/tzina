import Trees from "./trees"
import Fountain from "./fountain"
import SunLoader from './sun_loader'
import Extras from './extras';
import Chapters from './chapters'

import DebugUtil from "./util/debug"
import _ from 'lodash';

const MODEL_PATH = "assets/square/scene.json"
const BUILDINGS_PATH = "assets/square/buildings.json"
const SUNS_PATH = "assets/square/suns.json"
const COLLIDERS_PATH = "assets/square/colliders.json"
const BENCHES_PATH = "assets/square/benches.json"
const FOUNTAIN_PATH = "assets/square/fountain.json"
const GROUND_PATH = "assets/square/ground_tile.json"
const TEXTURES_PATH = "assets/square/textures.json"

export default class Square extends THREE.Object3D{
    constructor(collisionManager, renderer, camera, config) {
        super();
        console.log("Square constructed!")

        this.collisionManager = collisionManager;
        this.renderer = renderer;
        this.config = config;
        this.camera = camera;

        this.debug = true;

        this.sunTextureOffsets = {
            19 : 0.5,
            17 : 0.5,
            12 : 0.5,
            9 : 0.5,
            7 : 0.5
        };

        this.ENTRY_POINTS = [
            {
                hour: 19,
                worldPosition: [-12,13,40],
                startPosition: [-25, 20, -8],
                endPosition: [-18, 22.1, -7]
            },
            {
                hour: 17,
                worldPosition: [50,13,26],
                startPosition: [-3, 20, 43],
                endPosition: [-3.5, 22.1, 18]
            },
            {
                hour: 12,
                worldPosition: [-14,12,41],
                startPosition: [22, 20.5, 38.5],
                endPosition: [14, 22.1, 8.5]
            },
            {
                hour: 9,
                worldPosition: [-7.5 ,12,51],
                startPosition: [40, 20.5, 17.6],
                endPosition: [15, 22.1, -1]
            },
            {
                hour: 7,
                worldPosition: [63,12,5],
                startPosition: [-26, 20.5, -62],
                endPosition: [-13, 22.1, -12]
            },
            {
                hour: 0,
                startPosition: [-60, 20.5, -30],
                endPosition: [-20, 22.1, -8]
            }
        ]

        this.currentSun = null;
        this.activatedSun = null;
        this.controlPassed = false;
    }
    init(loadingManager) {
        loadingManager.itemStart("Square");
        this.trees = new Trees(this.camera, this.renderer);
        this.extras = new  Extras(this.camera, this.renderer);
        this.fountain = new Fountain();

        let loaders = [
            this.loadSquare(loadingManager),
            this.fountain.init(loadingManager),
            this.loadBuildings(loadingManager),
            this.loadSuns(loadingManager),
            this.loadColliders(loadingManager),
            this.loadBenches(loadingManager),
            this.loadGround(loadingManager),
            this.loadFountain(loadingManager)
        ];
        if (!this.config.noExtras) {
            loaders.push(this.extras.init(loadingManager));
        }
        if (!this.config.noTrees) {
            loaders.push(this.trees.init(loadingManager));
        }
        Promise.all(loaders)
        .then((results) => {
            console.log("Load results", results);
            let obj = results[0];
            this.buildings = results[2];
            this.suns = results[3];
            this.suns.rotation.y = Math.PI * -70 / 180;

            this.mesh = obj;
            this.mesh.rotation.order = "YXZ";

            this.colliders = results[4];
            this.mesh.add(this.colliders);

            this.benches = results[5];

            this.fountainMesh = results[6];
            
            this.ground = results[7];


            // Clockwork rotation object
            this.clockwork = new THREE.Object3D();
            //this.clockwork.rotation.order = "YXZ;"

            //this.clockwork.add(this.benches);
            this.clockwork.add(this.fountainMesh)

            // Starts as a child of the square which does the actual rotation
            this.mesh.add(this.clockwork);
            this.activeClockwork = this.mesh;
            this.mesh.add(this.trees);
            this.mesh.add(this.fountain);
            this.mesh.add(this.extras);
            this.mesh.add(this.buildings);
            this.mesh.add(this.suns);
            this.mesh.add(this.ground);
           




            this.addColliders();
            this.setSquareMiddle();

            // VIVE SCALES
            this.mesh.scale.set(0.4, 0.4, 0.4);
                /*
            this.benches.scale.set(2,2,2);
            this.benches.position.set(7.13,-34,8);
            this.buildings.scale.set(3,3,3); 
                */

            this.fountain.position.set(0.8,23.6, -0.6);

            this.buildings.rotation.y = 4 * Math.PI / 180;

            DebugUtil.positionObject(this.ground, "ground");
            //DebugUtil.positionObject(this.buildings, "Buildings");
            //DebugUtil.positionObject(this.fountainMesh, "Fountain") */
            //            DebugUtil.positionObject(this.clockwork, "Clockwork");

            //this.fountain.scale.set(0.25, 0.25, 0.25);
            console.log("Finished loading square");
            loadingManager.itemEnd("Square");

            // INITIAL STATE
            this.turnOffSuns();
            
/*            events.emit("add_gui", obj.position, "x"); */
            //events.emit("add_gui",{}, obj.position, "y"); 
            //events.emit("add_gui", obj.position, "z");
           // events.emit("add_gui", {step: 0.01} ,obj.rotation, "y", 0, 2 * Math.PI);

        });

        events.on("gaze_started", (name) => {
            this.activateSun(name);
        });
        events.on("gaze_stopped", (name) => {
            this.deactivateSun(name);
        });

        events.on("angle_updated", (hour) => {
            console.log("Square angle updated. Adding colliders");
            this.addColliders();
            this.setSquareMiddle(); 
        });

        events.on("control_threshold", (passed) => {
            this.controlPassed = passed;
            if (passed) {
                this.activeClockwork = this.clockwork;

                // Show the hidden loader
                let sun = this.suns.getObjectByName(this.currentSun)
                if (sun) {
                    sun.getObjectByName(this.currentSun + "_L").visible = true;
                }
            }
        });
    }
    update(dt,et) {
        this.fountain.update(dt);
        if (!this.config.noTrees) {
            this.trees.update(dt,et);
        }
        if (!this.config.noExtras) {
            this.extras.update(dt);
        }
        for (let i = 0; i < this.suns.children.length; i++) {

            this.suns.children[i].children[2].update(dt,et);

           // console.log(this.suns.children[i].children[2]);

        }
    }

    updateSunProgress(name, progress) {
        this.sunTextureOffsets[name] = 0.5 - (0.5 * progress);
    //    console.log("Update sun progress ", name, progress, this.currentSun, this.sunTextureOffsets[name]);
        if (name == this.currentSun) {
            this.sunTexture.offset.y = this.sunTextureOffsets[name];
        }
    }
    
    turnOffSuns() {
        this.suns.children.forEach((obj) => {
            if (obj.children.length > 0) {
                this.turnOffSun(obj.name);
            }
        })
    }
//change material of non active sun
    turnOffSun(name) {
        //console.log("Turn off sun ", name);
        let sun = this.suns.getObjectByName(name);
        if (sun) {
            let sunMesh = sun.getObjectByName(name + "_F").children[0];
            //console.log("Turn off sun", sun);
            //sun.material.side = THREE.BackSide;
            sunMesh.material.color = new THREE.Color(0x888788);
            // sunMesh.material.emissive= new THREE.Color(0xBD9F6C);
             sunMesh.material.transparent= true;
            sunMesh.material.opacity = .8;
            sunMesh.material.map = this.sunTextureDesat;
            sunMesh.material.needsUpdate = true;
            sun.getObjectByName(name + "_L").visible = false;
        }
    }
// material color under the texture
    turnOnSun(name) {
        if (this.suns) {
            let sun = this.suns.getObjectByName(name)
            if (sun) {
                if (this.currentSun) {
                                    let strokeMesh = sun.getObjectByName(name + "_S").children[0];
                strokeMesh.material.color.set(0x666633);
                 strokeMesh.material.needsUpdate = true;
                    this.turnOffSun(this.currentSun);

                }
                let sunMesh = sun.getObjectByName(name + "_F").children[0];
               // sunMesh.material.color = new THREE.Color(0xfff06f);
                sunMesh.material.emissive= new THREE.Color(11904267);
                //sunMesh.material.side = THREE.Backside;
                   // sunMesh.material.opacity = 1.00;
                 sunMesh.material.transparent = false;
                sunMesh.material.map = this.sunTexture;
                this.sunTexture.offset.y = this.sunTextureOffsets[name];
                //texture offset by progress in chapter 
                sunMesh.material.needsUpdate = true;
                this.currentSun = name;

                // Show loader
                if (this.controlPassed) {
                    sun.getObjectByName(name + "_L").visible = true;
                    sun.getObjectByName(name + "_L").disorganize();
                }

                //console.log("Turned on sun", sun);
            }
        }
    }

    activateSun(name) {

        console.log("Activate sun! ", name);

        let sun = this.suns.getObjectByName(name)
        if (sun) {
            let sunMesh = sun.getObjectByName(name + "_F").children[0];
            console.log("Turn on sun", sun);
            sunMesh.material.color = new THREE.Color(0x000D0A);
            sunMesh.material.map = this.sunTexture;
            this.sunTexture.offset.y = this.sunTextureOffsets[name];
            sunMesh.material.needsUpdate = true;
            let sunLoader = sun.getObjectByName(name + "_L");
            sunLoader.visible = true;
            sunLoader.organize();
        }
    }
// material setting when looking at the sun
    deactivateSun(name) {
        console.log("Deactivated sun! ", name);
        let sun = this.suns.getObjectByName(name)
        if (sun) {
            let sunLoader = sun.getObjectByName(name + "_L");
            let sunMesh = sun.getObjectByName(name + "_F").children[0];
            sunMesh.material.color = new THREE.Color(0x666633);
              //sunMesh.material.emissive = new THREE.Color(16756224);
            sunMesh.material.map = this.sunTextureDesat;
            sunMesh.material.needsUpdate = true;
            this.sunTexture.offset.y = this.sunTextureOffsets[this.currentSun];
            sunLoader.disorganize();
            sunLoader.visible = false;
        }
    }

    explodeSun(name) {
        let sun = this.suns.getObjectByName(name)
        if (sun) {
            let sunLoader = sun.getObjectByName(name + "_L");
            sunLoader.explode();
        }
    }

    loadBuildings(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(BUILDINGS_PATH,( obj ) => {
                console.log("Loaded Buildings ", obj );
                resolve(obj);
            })
        });
    }
    loadSuns(loadingManager) {
        console.log("Loading suns")
        return new Promise((resolve, reject) => {
            let textureLoader = new THREE.TextureLoader(loadingManager);

            this.sunTexture = textureLoader.load("assets/square/sunActive_gradientSun2.png");
            this.sunTexture.repeat.set(1.0,0.5);

            this.sunTextureDesat = textureLoader.load("assets/square/sunActive_gradientDesat.jpg")

            //debug 
            console.log("Sun textures ", this.sunTexture, this.sunTextureDesat); 

            let loader = new THREE.ObjectLoader(loadingManager);

            events.emit("add_gui", {folder: "Sun texture", step: 0.01, listen: true} ,this.sunTexture.offset, "y", 0, 1);
            loader.load(SUNS_PATH,( obj ) => {
                console.log("Loaded suns", obj)

                let reorderedSuns = new THREE.Object3D();
                Chapters.forEach((chapter) => {
                    let parent = obj.getObjectByName(chapter.hour.toString());
                    if (parent) {
                        let fill = obj.getObjectByName(chapter.hour.toString() + "_F");
                        fill.position.set(0,0,0);

                        // Replace the geometry with my own
                        fill.children[0].geometry.dispose();
                        fill.children[0].geometry = new THREE.SphereBufferGeometry( 2.0 , 32, 32  ); //size of fill
                        fill.scale.set(1,1,1);
                        parent.add(fill);

                        let stroke = obj.getObjectByName(chapter.hour.toString() + "_S");
                        stroke.children[0].material.side = THREE.BackSide;
                        stroke.children[0].material.color.set(0x666633);
                        //stroke.children[0].material.emissive.set(0xcccccc);
                        stroke.children[0].material.opacity = 0.32;
                        stroke.position.set(0,0,0);
                        stroke.scale.set(1,1,1);
                        stroke.children[0].geometry.dispose();
                        stroke.children[0].geometry = new THREE.SphereBufferGeometry( 2.1, 32, 32  );   //size of stroke
                        parent.add(stroke);

                        reorderedSuns.add(parent);

                        // Add the sun loader
                        let sunLoader = new SunLoader(this.renderer);
                        sunLoader.init();
                        sunLoader.name = chapter.hour.toString() + "_L";
                        parent.add(sunLoader);
                        sunLoader.scale.set(0.83, 0.83, 0.83);
                        sunLoader.rotation.set(
                            chapter.sunLoaderRotation[0] * Math.PI / 180,                             
                            chapter.sunLoaderRotation[1] * Math.PI / 180,                             
                            chapter.sunLoaderRotation[2] * Math.PI / 180,
                            "XYZ"
                        );
                        if (this.debug) {
                            //DebugUtil.positionObject(sunLoader, sunLoader.name, true, -50, 50, chapter.sunLoaderRotation);
                        }

                        
                    }
                })


                console.log("Reordered suns", reorderedSuns);
                




                resolve(reorderedSuns);
            });
        });
    }
    loadColliders(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(COLLIDERS_PATH,( obj ) => {
                let colliders;
                obj.children  = _.filter(obj.children, function(o) { return (o.name != "BenchColliders2" && o.name != "BenchColliders"); });
                obj.children.forEach((o) => {o.children.splice(0,1)});
                console.log("Loaded square colliders ", obj);
                resolve(obj);
            });
        });
    }
    loadBenches(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(BENCHES_PATH,( obj ) => {
                console.log("Loaded square benches ", obj);
                resolve(obj);
            });
        });
    }
    loadFountain(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(FOUNTAIN_PATH,( obj ) => {
                console.log("Loaded square fountain ", obj);
                resolve(obj);
            });
        });
    }
    loadGround(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(GROUND_PATH,( obj ) => {
                console.log("Loaded ground fountain ", obj);
                resolve(obj);
            });
        });
    }
    loadTextures(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(TEXTURES_PATH,( obj ) => {
                console.log("Loaded square textures ", obj);

                // Disable depth write for the texture planes
                for (let i = 0; i < obj.children.length; i++) {
                    obj.children[i].children[0].material.depthWrite = false;
                }
                resolve(obj);
            });
        });
    }
    loadSquare(loadingManager) {
        return new Promise((resolve, reject) => {
            let loader = new THREE.ObjectLoader(loadingManager);
            loader.load(MODEL_PATH,( obj ) => {
                console.log("Loaded square ", obj);

                this.rotation.y = Math.PI * 150 / 180;
                this.updateMatrixWorld();

                this.add(obj);
                //collisionManager.addBoundingBoxes(obj,this);

                this.sphereMesh = obj.getObjectByName("SkySphere").children[0];
                console.log("Sky sphere", this.sphereMesh);
                resolve(obj);
            });

        });
    }

    setSquareMiddle() {
        this.squareMiddle  = this.mesh.getObjectByName("f_06");
        if (this.squareMiddle) {
            this.squareCenter  = new THREE.Vector3();
            this.squareCenter.setFromMatrixPosition(this.squareMiddle.matrixWorld);
            console.log("Square center", this.squareCenter);
        } else {
            this.squareCenter = new THREE.Vector3(0,0,0);
        }
    }

    addColliders() {
        this.mesh.updateMatrixWorld(true);
        //let aroundFountain  = this.mesh.getObjectByName("f_11_SubMesh 0");
        /*
        this.colliders.forEach((collider) => {
            collider.matrixWorld.multiply(this.mesh.matrixWorld);
        })*/
        this.collisionManager.refreshSquareColliders(this.colliders.children);
    }

    getSphereMesh() {
        return this.sphereMesh;
    }

    getCenterPosition() {
        return this.squareCenter;
    }

    getSun(name) {
        return this.suns.getObjectByName(name)
    }

    getSunPosition(name) {
        let sun = this.suns.getObjectByName(name)
        if (sun) {
            let sunMesh = sun.children[0]; 
            return new THREE.Vector3().setFromMatrixPosition(sunMesh.matrixWorld);
        } else {
            return null;
        }
    }

    getClockwork() {
        return this.activeClockwork;

    }
}
