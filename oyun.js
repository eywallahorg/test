// HTML canvas elementine erişim
const canvas = document.getElementById("renderCanvas");

// Babylon.js motorunu başlat
const engine = new BABYLON.Engine(canvas, true);

// Sahneyi oluşturma fonksiyonu
const createScene = function () {
    const scene = new BABYLON.Scene(engine);

    // Kamera oluşturma
    // Bu kamera, arabanın arkasında durup onu takip edecek
    const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -15), scene);

    // Işık oluşturma
    // Oyunun daha iyi görünmesi için bir yarım küre ışık ekliyoruz
    const light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);

    // Yol (Highway) oluşturma
    // Yüksekliği 0.1 olan geniş bir kutu yapıyoruz
    const ground = BABYLON.MeshBuilder.CreateBox("ground", { width: 100, height: 0.1, depth: 500 }, scene);
    ground.position.y = -0.5; // Zemini aşağı kaydırıyoruz
    ground.material = new BABYLON.StandardMaterial("groundMat", scene);
    ground.material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gri renk

    // Araba oluşturma
    // Basit bir kutu olarak temsil ediliyor
    const car = BABYLON.MeshBuilder.CreateBox("car", { width: 2, height: 1.5, depth: 4 }, scene);
    car.position.y = 0.75; // Yolda duracak şekilde konumlandır
    car.material = new BABYLON.StandardMaterial("carMat", scene);
    car.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Kırmızı renk

    // Kamerayı arabaya bağlama
    camera.lockedTarget = car;

    return scene;
};

// Sahneyi çağır ve render et
const scene = createScene();
engine.runRenderLoop(function () {
    scene.render();
});

// Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
window.addEventListener("resize", function () {
    engine.resize();
});
