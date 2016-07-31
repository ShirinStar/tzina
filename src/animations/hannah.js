import ImprovedNoise from '../util/improved_noise'
import TextureAnimator from '../util/texture_animator'
import EndArrayPlugin from '../util/EndArrayPlugin'
TweenPlugin.activate([EndArrayPlugin]);

export default class HannahAnimation extends THREE.Object3D {
    constructor() {
        super();
        this.BASE_PATH = 'assets/animations/hannah';
    }

    init(loadingManager) {
        this.loadingManager = loadingManager;
        this.setupAnim();
    }

    setupAnim() {
        this.loadingManager.itemStart("HannahAnim");
        this.domeMorphTargets = [];
        this.perlin = new ImprovedNoise();

        // setup animation sequence
        this.animStart = false;
        this.sequenceConfig = [
            { time: 4, anim: ()=>{this.beDome()} },
            { time: 10, anim: ()=>{this.showLeaf()} },
            { time: 16, anim: ()=>{this.beCollapse()} }
        ];

        let hannahRoomFiles = [this.BASE_PATH + "/models/hannah_room/hr_bookshelf.js", this.BASE_PATH + "/models/hannah_room/hr_chair.js",
                               this.BASE_PATH + "/models/hannah_room/hr_door.js", this.BASE_PATH + "/models/hannah_room/hr_fireplace.js",
                               this.BASE_PATH + "/models/hannah_room/hr_photo1.js", this.BASE_PATH + "/models/hannah_room/hr_photo2.js",
                               this.BASE_PATH + "/models/hannah_room/hr_photo3.js", this.BASE_PATH + "/models/hannah_room/hr_photo4.js",
                               this.BASE_PATH + "/models/hannah_room/hr_photo5.js", this.BASE_PATH + "/models/hannah_room/hr_room2.js",
                               this.BASE_PATH + "/models/hannah_room/hr_shelf.js", this.BASE_PATH + "/models/hannah_room/hr_sidewall.js",
                               this.BASE_PATH + "/models/hannah_room/hr_sofa.js", this.BASE_PATH + "/models/hannah_room/hr_sofa2.js",
                               this.BASE_PATH + "/models/hannah_room/hr_table.js", this.BASE_PATH + "/models/hannah_room/hr_window.js"];

        let doodleMenTexFiles = [this.BASE_PATH + "/images/doodleMen1.png", this.BASE_PATH + "/images/doodleMen2.png", this.BASE_PATH + "/images/doodleMen3.png"];
        let doodleMenTex = [], doodleMen = [];
        this.doodleMenAnimators = [];

        let p_tex_loader = new THREE.TextureLoader(this.loadingManager);

        let twigGeo, leafGeo, evilGeo, twigMat, leafMat, evilMat;

        leafMat = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors, wireframe: true } );

        let evilTex = p_tex_loader.load(this.BASE_PATH + '/images/spike3.jpg');

        twigMat = new THREE.MeshBasicMaterial( {color: 0x985a17, wireframe: true} );

        evilTex.wrapS = THREE.RepeatWrapping;
        evilTex.wrapT = THREE.RepeatWrapping;
        evilTex.repeat.set( 1, 4 );
        evilMat = new THREE.MeshLambertMaterial( {map: evilTex} );

        this.center = new THREE.Mesh( new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({color: 0xff0000}));
        this.center.position.set(0,-5,2);
        this.add(this.center);

        let loader = new THREE.JSONLoader(this.loadingManager);
        loader.load(this.BASE_PATH + "/models/spike_curvey_s.js", (geometry, material) => {
            evilGeo = geometry;
        });
        loader.load(this.BASE_PATH + "/models/leavesss_less_s.js", (geometry, material) => {
            leafGeo = geometry;

            // ref: https://stemkoski.github.io/Three.js/Vertex-Colors.html
            let face, numberOfSides, vertexIndex, point, color;
            let faceIndices = [ 'a', 'b', 'c', 'd' ];
            // vertex color
            for(let i=0; i < leafGeo.faces.length; i++)
            {
                face = leafGeo.faces[i];
                numberOfSides = (face instanceof THREE.Face3 ) ? 3 : 4;
                // assign color to each vertex of current face
                for(let j=0; j < numberOfSides; j++)
                {
                    vertexIndex = face[ faceIndices[j] ];
                    //store coordinates of vertex
                    point = leafGeo.vertices[ vertexIndex ];
                    // initialize color variable
                    color = new THREE.Color();
                    // console.log( ((point.x+1)*30) / ((j+4)*14) );
                    color.setRGB( ((point.x+1)*30) / ((j+4)*15), 0.5 + (point.y*10) / ((j+4)*13), ((point.x+1)*30) / ((j+4)*14) );
                    face.vertexColors[j] = color;
                }
            }
        });

        loader.load(this.BASE_PATH + "/models/twig_s.js", function(geometry, material){
            twigGeo = geometry;
        });

        this.loadModelDome(this.BASE_PATH + '/models/shield_s.js', this.BASE_PATH + '/models/dome_s.js', this.BASE_PATH + '/models/collapse_s.js')
        .then((dome) => {

            this.dome = dome;
            this.add( this.dome );
            console.log("Loaded dome, setting up 'things'", this.dome);

            let centerV = this.center.position.clone();
            let upp = new THREE.Vector3(0,-1,0);

            for(let i = 0; i < this.dome.geometry.vertices.length; i++){
                let fMesh = new Thing( this.dome.geometry.vertices[i],
                                       twigGeo, leafGeo, evilGeo,
                                       twigMat, leafMat, evilMat );

                this.add(fMesh.mesh);

                let vA = this.dome.geometry.vertices[i].clone();
                let tempA = new THREE.Vector3();
                tempA.set( this.lookupTable[i%50]*0.5, this.lookupTable[(i+1)%50]*0.5, this.lookupTable[(i+2)%50]*0.5 );
                vA.add( tempA );

                let m1 = new THREE.Matrix4();
                m1.lookAt( centerV, vA, upp );
                fMesh.mesh.quaternion.setFromRotationMatrix( m1 );

                this.domeMorphTargets.push( fMesh );
            }
            // console.log("domeMorphTargets length: " + this.domeMorphTargets.length);

            // this.updateVertices();
            this.initParticles();
        });
        let hannahRoom = new THREE.Object3D();

        // DOODLE_MEN
        let menGeometry = new THREE.PlaneGeometry( 5, 10 );
        for(let i = 0; i < doodleMenTexFiles.length; i++){
            let mTex = p_tex_loader.load( doodleMenTexFiles[i] );
        
            let mAni = new TextureAnimator( mTex, 2, 1, 2, 60, [0,1] );
            this.doodleMenAnimators.push(mAni);

            let mMat = new THREE.MeshBasicMaterial( {map: mTex, side: THREE.DoubleSide, transparent: true} );
            let mMesh = new THREE.Mesh( menGeometry, mMat );
            mMesh.position.x = -15-i*6;
            mMesh.position.y = 7.5;
            hannahRoom.add(mMesh);
            doodleMen.push(mMesh);
        }

        for(let i = 0; i < hannahRoomFiles.length; i++){
            loader.load( hannahRoomFiles[i], function(geometry){
                let colorValue = Math.random() * 0xFF | 0;
                let colorString = "rgb("+colorValue+","+colorValue+","+colorValue+")";
                let mat = new THREE.MeshLambertMaterial({ color: colorString });
                let meshhh = new THREE.Mesh(geometry, mat);
                hannahRoom.add(meshhh);
            });
        }
        hannahRoom.scale.multiplyScalar(0.02);
        hannahRoom.position.set(0,2,1);
        this.add(hannahRoom);

        this.loadingManager.itemEnd("HannahAnim");

        this.lookupTable=[];
        for (var i=0; i<50; i++) {
          this.lookupTable.push(Math.random());
        }

        this.completeSequenceSetup();
    }

    completeSequenceSetup() {
        for(let i=0; i<this.sequenceConfig.length; i++){
            this.sequenceConfig[i].performed = false;
        }
    }

    initParticles() {
        let p_tex_loader = new THREE.TextureLoader(this.loadingManager);
        let particleTex = p_tex_loader.load(this.BASE_PATH + '/images/dandelion_particle.jpg');

        this.particleGroup = new SPE.Group({
            texture: {
                value: particleTex
            },
            depthTest: false
        });

        // reduce emitter amount to be 1/5 of domeMorphTargets.length
        for(let i = 0; i < this.domeMorphTargets.length-10; i+=10){
            let emitter = new SPE.Emitter({
                type: SPE.distributions.SPHERE,
                // duration: 10,
                maxAge: {
                    value: 10,
                    spread: 2
                },
                position: {
                    value: this.domeMorphTargets[i].mesh.position,
                    radius: 0.2,
                    // spread: new THREE.Vector3(1,1,1),
                    // radiusScale: new THREE.Vector3(1,1,1),
                    // distribution: SPE.distributions.SPHERE
                },
                acceleration: {
                    value: new THREE.Vector3(0,-0.5,0),
                    // spread: new THREE.Vector3(0.5,-0.8,0.5)
                },
                velocity: {
                    value: new THREE.Vector3(0.3,-0.3,0.3)
                    // distribution: SPE.distributions.SPHERE
                },
                rotation: {
                    angle: 0.5
                },
                angle: {
                    value: [0,0.5,-0.5],
                    spread: [0,-0.5,0.5]
                },
                // color: {
                // 	value: new THREE.Color( 0xAA4488 )
                // },
                opacity: {
                    value: [0,1,1,1,0]
                },
                size: {
                    value: [.05,.25,.25,.25,.15]
                    // spread: [1,3]
                },
                particleCount: 3,
                drag: 0.6
                // wiggle: 15
                // isStatic: true
            });
            this.particleGroup.addEmitter( emitter );
        }
        this.add( this.particleGroup.mesh );
    }

    updateVertices() {

        // console.log( "dome's morphTargetInfluence[0] : " + this.dome.morphTargetInfluences[0]
        //             +", dome's morphTargetInfluence[1] : " + this.dome.morphTargetInfluences[1]);
        
        let morphTargets = this.dome.geometry.morphTargets;
        let morphInfluences = this.dome.morphTargetInfluences;
        let upp = new THREE.Vector3(0,-1,0);

        // get morph geometry update position data
        for(let i=0; i<this.shieldGeo.vertices.length; i++){
            let centerV = this.center.position.clone();
            let vA = new THREE.Vector3();
            let tempA = new THREE.Vector3();

            for ( let t = 0, tl = morphTargets.length; t < tl; t ++ ) {
                let influence = morphInfluences[ t ];
                let target = morphTargets[t].vertices[i];
                vA.addScaledVector( tempA.subVectors( target, this.shieldGeo.vertices[i] ), influence );
            }

            vA.add( this.shieldGeo.vertices[i] );
            tempA.set( this.lookupTable[i%50]*0.5, this.lookupTable[(i+1)%50]*0.5, this.lookupTable[(i+2)%50]*0.5 );
            vA.add( tempA );

            this.domeMorphTargets[i].mesh.position.copy( vA );

            if(i%10==0){
                if(i/10 != 38)
                    this.particleGroup.emitters[i/10].position.value = this.particleGroup.emitters[i/10].position.value.copy( vA );
            }
                        
            // rotate
            let m1 = new THREE.Matrix4();
            m1.lookAt( centerV, vA, upp );
            this.domeMorphTargets[i].mesh.quaternion.setFromRotationMatrix( m1 );
        }
    }

    beDome() {
        let tmpEndArray = [1,0];
        TweenMax.to( this.dome.morphTargetInfluences, 4, { endArray: tmpEndArray, ease: Power2.easeInOut, onUpdate: ()=>{this.updateVertices()} } );
    }

    showLeaf() {
        for(let i=0; i<this.domeMorphTargets.length; i++){
            TweenMax.to( this.domeMorphTargets[i].mesh.children[1].scale, 2, { x: 1, y: 1, z: 1, ease: Power2.easeOut } );
            TweenMax.to( this.domeMorphTargets[i].mesh.children[2].scale, 4, { x: 0.01, y: 0.01, z: 0.01, ease: Power4.easeIn } );
        }
    }

    beCollapse() {
        let tmpEndArray = [0,1];
        TweenMax.to( this.dome.morphTargetInfluences, 4, { endArray: tmpEndArray, ease: Power2.easeInOut, onUpdate: ()=>{this.updateVertices()} } );
    }

    loadModelDome (modelS, modelD, modelC) {

        let promise = new Promise( (resolve, reject) => {

            let loader = new THREE.JSONLoader(this.loadingManager);
            let domeMat = new THREE.MeshBasicMaterial({morphTargets: true, color: 0xAA4488, wireframe: true, visible: false});
            let followMat = new THREE.MeshBasicMaterial({color: 0xffff00});
            let followMesh = new THREE.Mesh(new THREE.SphereGeometry(10), followMat);


            loader.load(modelS, (geometry, material) => {

                this.shieldGeo = geometry;
                console.log(this.shieldGeo.vertices.length);
                
                loader.load(modelD, (geometryD, materialD) => {
                    let domeGeo = geometryD;

                    loader.load(modelC, (geometryC, materialC) => {
                        let collapseGeo = geometryC;

                        // let tempDome = new THREE.Mesh(domeGeo, followMat);
                        // tempDome.rotation.y = Math.PI;
                        // tempDome.scale.multiplyScalar(90);
                        // tempDome.updateMatrix();

                        // domeGeo.applyMatrix( tempDome.matrix );
                        // this.shieldGeo.applyMatrix( tempDome.matrix );
                        // collapseGeo.applyMatrix( tempDome.matrix );

                        this.shieldGeo.morphTargets[0] = {name: 't1', vertices: domeGeo.vertices};
                        this.shieldGeo.morphTargets[1] = {name: 't2', vertices: collapseGeo.vertices};
                        this.shieldGeo.computeMorphNormals();

                        let dome = new THREE.Mesh(this.shieldGeo, domeMat);
                        dome.name = "dome";
                        resolve(dome);
                    });
                });
                
            });
        });
        return promise;
    }

    update(dt,et) {
        if(this.particleGroup) {
            this.particleGroup.tick( dt );
        }
        for(let i=0; i < this.shieldGeo.vertices.length; i++){
            let h = this.perlin.noise(et*0.1, i, 1)/150;
            this.domeMorphTargets[i].mesh.position.addScalar( h );

            if( i % 10==0 ){
                if(i/10 != 38){
                    // this.particleGroup.emitters[i/6].position.value = this.particleGroup.emitters[i/6].position.value.addScalar( h );
                    this.particleGroup.emitters[i/10].position.value = this.particleGroup.emitters[i/10].position.value.copy( this.domeMorphTargets[i].mesh.position );
                }
            }
        }

        // DOODLE_MEN
        if( this.doodleMenAnimators.length > 0) {
            for(let i=0; i < this.doodleMenAnimators.length; i++){
                this.doodleMenAnimators[i].updateWithOrder( 300*dt );
            }
        }

        // ANIMATION_SEQUENCE
        if(!this.animStart){
            this.animStartTime = et;
            this.animStart = true;

            console.log("this dome", this.dome);
        }

        if(this.animStart){
            let animTime = et-this.animStartTime;

            for(let i=0; i<this.sequenceConfig.length; i++){

                if(animTime >= this.sequenceConfig[i].time && !this.sequenceConfig[i].performed){

                    this.sequenceConfig[i].anim( this );
                    this.sequenceConfig[i].performed = true;
                    console.log("do anim sequence: " + i);
                }
            }
        }
    }
}

function Thing( pos, geoTwig, geoLeaf, geoEvil, twigMat, leafMat, evilMat ){

    this.position = pos.clone();
    this.mesh = new THREE.Object3D();

    // v.2
    this.twig = new THREE.Mesh(geoTwig, twigMat);
    this.leaf = new THREE.Mesh(geoLeaf, leafMat);
    this.evil = new THREE.Mesh(geoEvil, evilMat);

    this.mesh.add(this.twig);
    this.mesh.add(this.leaf);
    this.mesh.add(this.evil);

    this.mesh.position.copy(this.position);

    this.mesh.children[1].scale.set(0.01, 0.01, 0.01);
    this.mesh.children[0].scale.set(0.01, 0.01, 0.01);
}

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
