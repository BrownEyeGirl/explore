const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer({
antialias: true,
alpha: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

camera.position.z=12;
camera.position.y=0;

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const galleryGroup = new THREE.Group();
galleryGroup.position.x = -5; 
scene.add(galleryGroup);

const radius = 6;
const height =30;
const segments = 30;

const cylinderGeometry = new THREE.CylinderGeometry(
    radius, radius, height, segments,1, true);

 const cylinderMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
 });   

 const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    galleryGroup.add(cylinder);

    const textureLoader = new THREE.TextureLoader();

   const totalImages = 30;
    function getRandomImage() {
    return Math.floor(Math.random() * totalImages) + 1;
}
function loadImageTexture(imageNumber) {
  return new Promise((resolve) => {

    const path = `assets/images/space3/img${imageNumber}.jpg`;
    console.log("loading:", path);

    const texture = textureLoader.load(
      path,

      (loadedTexture) => {
        loadedTexture.generateMipmaps = true;
        loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;

        resolve(loadedTexture);
      },

      undefined,

      (err) => {
        console.error("FAILED:", path);
      }
    );

  });
}

function createCurvedPlane(width, height, radius, segments) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uvs = [];

    const segmentsX = segments*4;
    const segmentsY= Math.floor(height*12);
    const theta=width/radius;

    for(let y=0; y<= segmentsY; y++){
        const yPos =(y/segmentsY- 0.5) * height;
        for (let x =0; x<= segmentsX; x++){
            const xAngle=(x/segmentsX-0.5)* theta;
            const xPos = Math.sin(xAngle)*radius;
            const zPos = Math.cos(xAngle)*radius;
            vertices.push(xPos,yPos,zPos);
        
         uvs.push(x / segmentsX, y / segmentsY);
        }
    }

    for(let y=0; y<segmentsY; y++){
        for(let x=0; x< segmentsX; x++){
            const a = x + (segmentsX +1) * y;
            const b = x +(segmentsX + 1 ) * (y+1);
            const c = x+1 +(segmentsX +1) *(y+1);
            const d = x+1 +(segmentsX+1) * y;
            indices.push(a,b,d);
            indices.push(b,c,d);
        }
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices,3)
    );
    geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}


const numVerticalSections =12;
const blocksPerSection =4;
const verticalSpacing =3.25;
const blocks =[];

const totalBlockHeight = numVerticalSections * verticalSpacing;
const heightBuffer =(height-totalBlockHeight)/2;
const startY = -height/2 + heightBuffer+verticalSpacing;

const sectionAngle =(Math.PI*2)/blocksPerSection;
const maxRandomAngle = sectionAngle *0.3;

async function createBlock(baseY,yOffset, sectionIndex,blockIndex){
    const blockGeometry = createCurvedPlane(4,2.4, radius,10);
    const imageNumber = (sectionIndex * blocksPerSection + blockIndex) % 30 + 1;
    const texture = await loadImageTexture(imageNumber);

 const blockMaterial = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide,
  
});
const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.y = baseY + yOffset;

    const blockContainer = new THREE.Group();
    const baseAngle =sectionAngle *blockIndex;
    const randomAngleOffset = (Math.random()*2-1)*maxRandomAngle;
    const finalAngle = baseAngle + randomAngleOffset;
    
    blockContainer.rotation.y = finalAngle;
    blockContainer.add(block);

    return blockContainer;
}

async function initializeBlocks(){
    for (let section =0; section <numVerticalSections; section++){
        const baseY= startY +section * verticalSpacing;

        for(let i=0;i < blocksPerSection; i++){
            const yOffset = Math.random()* 0.2-0.1;
            const blockContainer = await createBlock(baseY, yOffset, section, i);
            blocks.push(blockContainer);
            galleryGroup.add(blockContainer);
        }
    }
}

const lenis = new Lenis({
    autoRaf: true,
});

let currentScroll =0;
const totalScroll= document.documentElement.scrollHeight - window.innerHeight;
let rotationSpeed=0;
const baseRotationSpeed =0.0025;
const maxRotationSpeed =0.05;

lenis.on("scroll", (e) => {
    currentScroll = window.pageYOffset;
    rotationSpeed =e.velocity *0.005;
});

function animate(){
requestAnimationFrame(animate);

    const scrollFraction = currentScroll/ totalScroll;
    const targetY = scrollFraction *height - height/2;
    camera.position.y = -targetY;

    galleryGroup.rotation.y += baseRotationSpeed + rotationSpeed;
    rotationSpeed *= 2;

    renderer.render(scene, camera);
}
// const video = document.createElement("video");
// // video.src = "assets/images/hughe.mp4";
// video.loop = true;
// video.muted = true;
// video.play();

// const texture = new THREE.VideoTexture(video);

// const geometry = new THREE.PlaneGeometry(2,1);
// const material = new THREE.MeshBasicMaterial({ map: texture });

// const mesh = new THREE.Mesh(geometry, material);
// scene.add(mesh);


initializeBlocks();
animate();