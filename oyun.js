// HTML canvas elementine erişim
const canvas = document.getElementById("renderCanvas");

// Babylon.js motorunu başlat
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

let scene; // Sahneyi globalde tanımlayalım
let car;
let ground;
let camera;
let score = 0;
let isGameOver = false;
const obstacles = [];
let obstacleSpawnTimer = 0;
const obstacleInterval = 200; // Engellerin belirme sıklığı (frame sayısı)

// Sahneyi oluşturma fonksiyonu
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1); // Açık mavi gökyüzü rengi

    // Kamera oluşturma (Arabanın arkasında ve takip eden)
    camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -20), scene);
    camera.radius = 25; // Kameranın arabaya uzaklığı
    camera.heightOffset = 8; // Kameranın arabanın ne kadar yukarısında olacağı
    camera.rotationOffset = 0; // Kameranın arabaya göre açısı
    camera.cameraAcceleration = 0.2; // Kameranın takip hızlanması
    camera.maxCameraSpeed = 5; // Kameranın maksimum hızı

    // Işık oluşturma
    const light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;

    // Yol (Highway) oluşturma
    // Yol daha uzun ve daha ince olacak
    ground = BABYLON.MeshBuilder.CreateBox("ground", { width: 10, height: 0.1, depth: 1000 }, scene);
    ground.position.y = -0.5; // Zemini aşağı kaydırıyoruz
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Koyu gri renk
    ground.material = groundMaterial;

    // Araba oluşturma
    car = BABYLON.MeshBuilder.CreateBox("car", { width: 1.5, height: 1, depth: 3 }, scene);
    car.position.y = car.getBoundingInfo().boundingBox.extendSize.y; // Yolda duracak şekilde konumlandır
    car.position.z = -50; // Başlangıçta biraz geride
    const carMaterial = new BABYLON.StandardMaterial("carMat", scene);
    carMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Yeşil renk
    car.material = carMaterial;

    // Kamerayı arabaya bağlama
    camera.lockedTarget = car;

    // Fizik motoru (isteğe bağlı ama çarpışmalar için faydalı olabilir)
    // scene.usePhysicsEngine = true;
    // scene.enableGravity(new BABYLON.Vector3(0, -9.81, 0));
    // car.physicsImpostor = new BABYLON.PhysicsImpostor(car, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5, restitution: 0.2 }, scene);
    // ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.2 }, scene);


    // Puan göstergesi için HTML elementini hazırla
    const scoreElement = document.createElement("div");
    scoreElement.id = "score";
    scoreElement.style.position = "absolute";
    scoreElement.style.top = "10px";
    scoreElement.style.left = "10px";
    scoreElement.style.color = "white";
    scoreElement.style.fontSize = "24px";
    scoreElement.style.fontFamily = "Arial, sans-serif";
    scoreElement.style.zIndex = "10";
    document.body.appendChild(scoreElement);

    return scene;
};

scene = createScene();

// --- Oyun Mekanikleri ---

// Araba hareket kontrolü
const speed = 0.2; // Arabanın ilerleme hızı
const laneWidth = 4; // Yolun şerit genişliği
let currentLane = 0; // Başlangıç şeridi (0: orta, -1: sol, 1: sağ)

scene.onKeyboardObservable.add((kbInfo) => {
    if (isGameOver) return;

    switch (kbInfo.type) {
        case 1: // Key Down
            if (kbInfo.event.key === "ArrowLeft") {
                if (currentLane > -1) {
                    currentLane--;
                    moveCarToLane(currentLane);
                }
            } else if (kbInfo.key === "ArrowRight") {
                if (currentLane < 1) {
                    currentLane++;
                    moveCarToLane(currentLane);
                }
            }
            break;
    }
});

function moveCarToLane(lane) {
    const targetX = lane * laneWidth;
    // Animasyon ile yumuşak geçiş
    new BABYLON.Animation("carMoveAnim", "position.x", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)
        .setKeys([
            { frame: 0, value: car.position.x },
            { frame: 30, value: targetX } // 1 saniye sürsün (30 fps için)
        ]);
    scene.beginDirectAnimation(car, [{
        name: "moveAnim",
        framePerSecond: 30,
        keys: [
            { frame: 0, value: car.position.x },
            { frame: 30, value: targetX }
        ],
        loopBehavior: BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    }], 0, 30, false);
}


// Engelleri oluşturma fonksiyonu
function createObstacle() {
    const obstacle = BABYLON.MeshBuilder.CreateBox("obstacle", { width: 1.5, height: 2, depth: 2 }, scene);
    obstacle.position.y = obstacle.getBoundingInfo().boundingBox.extendSize.y; // Yerde duracak
    obstacle.position.z = 200; // Yolun sonundan başlat
    // Rastgele bir şeride yerleştir
    const randomLane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    obstacle.position.x = randomLane * laneWidth;

    const obstacleMaterial = new BABYLON.StandardMaterial("obstacleMat", scene);
    obstacleMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Kırmızı renk
    obstacle.material = obstacleMaterial;

    obstacles.push(obstacle);
}

// Çarpışma kontrolü
function checkCollisions() {
    for (const obstacle of obstacles) {
        if (car.intersectsMesh(obstacle, true)) {
            isGameOver = true;
            console.log("Oyun Bitti! Skor:", score);
            // Oyunu durduracak veya yeniden başlatma ekranı gösterecek kodlar buraya
            // Geçici olarak durduruyoruz
            engine.stopRenderLoop();
            alert("Oyun Bitti! Skorunuz: " + Math.floor(score));
            // Yeniden başlatmak için sayfayı yenileyebilirsiniz.
            break;
        }
    }
}

// Puanlama ve oyun döngüsü
engine.runRenderLoop(function () {
    if (isGameOver) return;

    const deltaTime = engine.getDeltaTime(); // Son frame'den beri geçen süre (milisaniye)

    // Araba ilerlemesi
    car.position.z -= speed;

    // Yolun sürekli ilerlemesi
    ground.position.z -= speed;
    // Yolun sonuna gelince başa al (sonsuz yol efekti için)
    if (ground.position.z < -ground.getBoundingInfo().boundingBox.depth.scale / 2) {
        ground.position.z += ground.getBoundingInfo().boundingBox.depth.scale;
    }

    // Engel belirleme
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer >= obstacleInterval) {
        createObstacle();
        obstacleSpawnTimer = 0;
    }

    // Engellerin ilerlemesi
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.position.z -= speed;

        // Ekrandan çıkan engelleri temizle
        if (obstacle.position.z < -10) {
            obstacle.dispose();
            obstacles.splice(i, 1);
        }
    }

    // Çarpışmaları kontrol et
    checkCollisions();

    // Puan güncelleme
    score += deltaTime / 1000; // Puanı saniye bazında güncelle
    document.getElementById("score").innerText = "Skor: " + Math.floor(score);

    scene.render();
});

// Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
window.addEventListener("resize", function () {
    engine.resize();
});
