var scene, camera, controls, renderer, 
	moonMesh, earthMesh, cloudMesh, rocketMesh,
	lineGeometry, lineMesh,
	rocket2Moon, rocketFrame = 0, toMoon,
	currentView = 0, playOnce = true;
var frame = 0;
var gui = new dat.GUI();
var params = {
	zoom : 50,
	rotate : 0,
	ChangeView : function(){
		currentView = (currentView+1) %3;
	}
}
gui.add(params, 'zoom', 25, 90);
gui.add(params, 'rotate', 0, 359);
gui.add(params, 'ChangeView');

function initialize() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, 1280/720, 1, 10000 );
	
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( 1280, 720 );
	document.body.appendChild( renderer.domElement );
	var light = new THREE.AmbientLight( 0x888888 );
	scene.add( light );

	var light = new THREE.DirectionalLight( 0xcccccc, 1 );
	light.position.set(10, 6, 10);
	scene.add( light );	
	
	rocket2Moon = new THREE.Vector3();
	toMoon = true;
}
function createGlobe() {
	var geometry   = new THREE.SphereGeometry(100, 32, 32);
	var material  = new THREE.MeshPhongMaterial();
	material.map = THREE.ImageUtils.loadTexture('imgs/earthmap1k.jpg')
	material.bumpMap = THREE.ImageUtils.loadTexture('imgs/earthbump1k.jpg');
	material.bumpScale = 0.05;
	material.specularMap    = THREE.ImageUtils.loadTexture('imgs/earthspec1k.jpg');
	material.specular  = new THREE.Color('grey');
	earthMesh = new THREE.Mesh(geometry, material);
	
	var canvasResult	= document.createElement('canvas')
	canvasResult.width	= 1024
	canvasResult.height	= 512
	var contextResult	= canvasResult.getContext('2d')		

	var imageMap	= new Image();
	imageMap.addEventListener("load", function() {
		var canvasMap	= document.createElement('canvas')
		canvasMap.width	= imageMap.width
		canvasMap.height= imageMap.height
		var contextMap	= canvasMap.getContext('2d')
		contextMap.drawImage(imageMap, 0, 0)
		var dataMap	= contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height)

		var imageTrans	= new Image();
		imageTrans.addEventListener("load", function(){
			var canvasTrans		= document.createElement('canvas')
			canvasTrans.width	= imageTrans.width
			canvasTrans.height	= imageTrans.height
			var contextTrans	= canvasTrans.getContext('2d')
			contextTrans.drawImage(imageTrans, 0, 0)
			var dataTrans		= contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height)
			var dataResult		= contextMap.createImageData(canvasMap.width, canvasMap.height)
			for(var y = 0, offset = 0; y < imageMap.height; y++){
				for(var x = 0; x < imageMap.width; x++, offset += 4){
					dataResult.data[offset+0]	= dataMap.data[offset+0]
					dataResult.data[offset+1]	= dataMap.data[offset+1]
					dataResult.data[offset+2]	= dataMap.data[offset+2]
					dataResult.data[offset+3]	= 255 - dataTrans.data[offset+0]
				}
			}
			contextResult.putImageData(dataResult,0,0)	
			material.map.needsUpdate = true;
		})
		imageTrans.src	= 'imgs/earthcloudmaptrans.jpg';
	}, false);
	imageMap.src	= 'imgs/earthcloudmap.jpg';

	var geometry	= new THREE.SphereGeometry(102, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		map		: new THREE.Texture(canvasResult),
		side		: THREE.DoubleSide,
		transparent	: true,
		opacity		: 0.8,
	})
	cloudMesh = new THREE.Mesh(geometry, material)
	earthMesh.add(cloudMesh);
	scene.add(earthMesh);
}

function addStars() {
	var geometry  = new THREE.SphereGeometry(4000, 32, 32);
	var material  = new THREE.MeshBasicMaterial();
	material.map   = THREE.ImageUtils.loadTexture('imgs/starfield.png');
	material.side  = THREE.BackSide;
	var mesh  = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}

function createMoon() {
	var geometry	= new THREE.SphereGeometry(25, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		map	: THREE.ImageUtils.loadTexture('imgs/moonmap1k.jpg'),
		bumpMap	: THREE.ImageUtils.loadTexture('imgs/moonbump1k.jpg'),
		bumpScale: 0.002,
	})
	moonMesh = new THREE.Mesh(geometry, material)
	moonMesh.position.z = 10;
	scene.add(moonMesh);
}

function createRocket() {
	var loader = new THREE.OBJLoader();	
	loader.load(
		'models/rocket.obj',
		function(object) {
			rocketMesh = object;
			object.scale.set(.005, .005, .005);
			object.position.set(0, 0, 0);
			object.rotateZ(Math.PI/2);
			scene.add( object )
		}
	);
}

function render() {
	animateEarth();
	rotateCamera();
	animateRocket();
	switch(currentView) {
		case 0:
			if(rocketMesh)
				camera.lookAt( rocketMesh.position );
			break;
		case 1:
			camera.lookAt( moonMesh.position );			
			break;
		case 2:
			camera.lookAt( earthMesh.position );
			break;
	}
	
	renderer.render( scene, camera );
}

function animateEarth() {
	earthMesh.rotation.y  += 1/(8*60);
	cloudMesh.rotation.y  += 1/(16*60);
	moonMesh.rotation.y += 1/(16*60);
	moonMesh.position.x = 1300 * Math.sin( frame * Math.PI / 4096 );
	moonMesh.position.z = 1300 * Math.cos( frame * Math.PI / 4096 );
}

function rotateCamera() {
	camera.lookAt( scene.position );
}

function animateRocket() {
	if(rocketMesh) {
		if((toMoon && rocketFrame > 600) || (!toMoon && rocketFrame < 720)){
			rocket2Moon.subVectors (rocketMesh.position, moonMesh.position).normalize();
			rocketMesh.rotation.y = Math.atan2(-rocket2Moon.z, rocket2Moon.x);
			rocketMesh.position.sub(rocket2Moon.multiplyScalar(1.2));
		} else {
			if (rocketFrame > 720 || (toMoon && rocketFrame < 600)) {
				rocket2Moon.subVectors (rocketMesh.position, earthMesh.position).normalize();
				rocketMesh.rotation.y = Math.atan2(-rocket2Moon.z, rocket2Moon.x);
				rocketMesh.position.sub(rocket2Moon.multiplyScalar(1.2));
			}
		}
		if(rocketMesh.position.distanceTo(moonMesh.position) < 12 && toMoon){
			if(playOnce){
				land = new Audio('audio/step.mp3');
				//land.play();
				playOnce = false;
			}
			rocketFrame = 0;
			toMoon = false;
		} else if (rocketMesh.position.distanceTo(earthMesh.position) < 50 && !toMoon){
			rocketFrame = 0;
			toMoon = true;
		}
	}	
}

function main(){
	initialize();
	createGlobe();
	createMoon();
	addStars();
	createRocket();
	
	camera.position.y = 150;
	camera.position.x = 1800;
	camera.position.z = 0;
	if(rocketMesh)
		camera.lookAt( rocketMesh.position );
	else
		camera.lookAt( earthMesh.position );
	renderer.render(scene, camera);
	
	liftoff = new Audio('audio/liftoff.mp3');
	//liftoff.play();
	
	function animate() {
		camera.fov = 100 - params.zoom;
		camera.updateProjectionMatrix();
		camera.position.x = 1800 * Math.cos( -params.rotate * Math.PI / 180 );
		camera.position.z = 1800 * Math.sin( -params.rotate * Math.PI / 180 );
		frame++;
		rocketFrame++;
		render();
		requestAnimationFrame(animate);
	}

	animate();
}