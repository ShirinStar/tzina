import TreesDef from './trees/trees_def'
const TREES_PATH = "assets/trees"
import DebugUtil from './util/debug'

export default class Trees extends THREE.Object3D {
    constructor() {
        super();
        this.debug = true;
    }

    init(loadingManager) {
        let treeTypes = {};
        this.treesLoader = new THREE.PLYLoader(loadingManager);

        return new Promise((resolve, reject) => {
            console.log("Loading trees", TreesDef)
            let typePromises = TreesDef.types.map((type) => {return this.loadType(type, treeTypes)});
            Promise.all(typePromises)
            .then((results) => {
                let material = new THREE.PointsMaterial( { size: 0.13, vertexColors: true } );
                let counter = 0;
                TreesDef.instances.forEach((instance) => {
                    let mesh = new THREE.Points( treeTypes[instance.type], material );
                    mesh.position.fromArray(instance.position);
                    if (instance.scale) {
                        mesh.scale.multiplyScalar(instance.scale);
                    }
                    mesh.rotation.order ="ZXY";
                    mesh.rotation.set(
                        instance.rotation[0] * Math.PI / 180,
                        instance.rotation[1] * Math.PI / 180,
                        instance.rotation[2]* Math.PI / 180
                    )
                        /*
                    mesh.rotateZ(90 * Math.PI / 180);
                    mesh.rotateX(instance.rotateX * Math.PI / 180);*/

                    this.add(mesh);

                    if (this.debug) {
                        DebugUtil.positionObject(mesh, instance.type + " " + counter, false, -40,40, instance.rotation);
                    }

                    counter++;
                    resolve();
                })
            });
        });      
    }

    loadType(props,store) {
        return new Promise((resolve, reject) => {
            console.log("Loading tree type ", props);
            this.treesLoader.load(TREES_PATH + "/" + props.fileName ,( geometry ) => {
                store[props.name] = geometry;
                resolve();
            });
        });
    }
}
