// script.js

// ==========================================
// 0. Matter.js 模組引入與全域變數
// ==========================================
// 確保 HTML 中已經引入了 Matter.js 的 CDN
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      World = Matter.World;

let engine, render, runner;

// ==========================================
// 1. 設定掉落動畫的圖片素材
// ==========================================
const FALLING_IMAGE_PATH = 'image/food/';
const FALLING_FOOD_FILES = [];

// 根據您的描述 "1Asset 1.png", "1Asset 2.png"... 自動產生檔名列表
// 根據實際資料夾內容設定總數（實際目錄含 16 張 1Asset X.png）
const totalImages = 16;

for (let i = 1; i <= totalImages; i++) {
    FALLING_FOOD_FILES.push(`1Asset ${i}.png`);
}

// helper: 回傳安全的 texture url（若所選檔案不存在於列表，會 fallback 到第一張）
function getSafeTextureUrl(filename) {
    if (!filename || FALLING_FOOD_FILES.indexOf(filename) === -1) {
        return FALLING_IMAGE_PATH + FALLING_FOOD_FILES[0];
    }
    return FALLING_IMAGE_PATH + filename;
}

// ==========================================
// 2. 資料與 DOM 元素
// ==========================================
const cuisines = Object.keys(RECIPES_BY_CUISINE);
let currentCuisine = cuisines[0];
const WHEEL_SLOTS = 12; 
const ANGLE_PER_SLOT = 360 / WHEEL_SLOTS;

// DOM 元素
const cuisineWheel = document.getElementById('cuisineWheel');
const dishWheel = document.getElementById('dishWheel');
const displayTitle = document.getElementById('displayTitle');
const displayDesc = document.getElementById('displayDesc');
const spinBtn = document.getElementById('spinBtn');

const screenAnimation = document.getElementById('screen-animation');
const fallingContainer = document.getElementById('falling-container');

const screen3 = document.getElementById('screen-3');
const backBtn = document.getElementById('backBtn');
const resultImage = document.getElementById('resultImage');
const resultTitle = document.getElementById('resultTitle');
const resultDesc = document.getElementById('resultDesc');
const resultPrice = document.getElementById('resultPrice');

// 輔助函數
function fillArrayToCount(array, count) {
    let result = [];
    if (array.length === 0) return result;
    while (result.length < count) { result = result.concat(array); }
    return result.slice(0, count);
}

// ==========================================
// 3. 渲染左側 (Cuisine Wheel)
// ==========================================
function renderCuisineWheel() {
    cuisineWheel.innerHTML = '';
    const filledCuisines = fillArrayToCount(cuisines, WHEEL_SLOTS);
    
    filledCuisines.forEach((cuisine, index) => {
        const angle = index * ANGLE_PER_SLOT;
        const el = document.createElement('div');
        el.className = 'text-item';
        el.style.transform = `rotate(${angle}deg)`;
        
        const span = document.createElement('span');
        span.textContent = cuisine.toUpperCase();
        
        span.addEventListener('click', (e) => {
           if (isDragging) return; 
           e.stopPropagation(); 
           rotateToCuisine(index);
        });

        el.appendChild(span);
        cuisineWheel.appendChild(el);
    });

    updateActiveCuisineText(0);
}

// ==========================================
// 4. 旋轉與拖曳邏輯
// ==========================================
function rotateToCuisine(index) {
    const normalizedIndex = (index % WHEEL_SLOTS + WHEEL_SLOTS) % WHEEL_SLOTS;
    const filledCuisines = fillArrayToCount(cuisines, WHEEL_SLOTS);
    const selectedCuisineName = filledCuisines[normalizedIndex];
    currentCuisine = selectedCuisineName;
    
    const targetRotation = -1 * normalizedIndex * ANGLE_PER_SLOT;
    
    cuisineWheel.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    cuisineWheel.style.transform = `rotate(${targetRotation}deg)`;
    cuisineWheel.dataset.rotation = targetRotation;

    updateActiveCuisineText(normalizedIndex);
    updateCenterPanel();
    renderDishWheel(selectedCuisineName);
}

function updateActiveCuisineText(activeIndex) {
    const items = cuisineWheel.querySelectorAll('.text-item');
    const safeIndex = (activeIndex % WHEEL_SLOTS + WHEEL_SLOTS) % WHEEL_SLOTS;
    
    items.forEach((item, idx) => {
        if (idx === safeIndex) item.classList.add('active');
        else item.classList.remove('active');
    });
}

// 拖曳功能
let isDragging = false;
let startAngle = 0;
let currentRotation = 0;

function getAngle(event, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
}

cuisineWheel.addEventListener('mousedown', startDrag);
cuisineWheel.addEventListener('touchstart', startDrag, { passive: false });

function startDrag(e) {
    isDragging = false;
    cuisineWheel.style.transition = 'none';
    const style = window.getComputedStyle(cuisineWheel);
    const matrix = new DOMMatrix(style.transform);
    currentRotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    startAngle = getAngle(e, cuisineWheel);
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function onDrag(e) {
    isDragging = true;
    e.preventDefault(); 
    const newMouseAngle = getAngle(e, cuisineWheel);
    const delta = newMouseAngle - startAngle;
    const nextRotation = currentRotation + delta;
    cuisineWheel.style.transform = `rotate(${nextRotation}deg)`;
}

function endDrag(e) {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
    
    if (!isDragging) return; 
    
    const style = window.getComputedStyle(cuisineWheel);
    const matrix = new DOMMatrix(style.transform);
    let finalAngle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    let snappedIndex = Math.round(finalAngle / -ANGLE_PER_SLOT);
    
    setTimeout(() => {
        isDragging = false;
        rotateToCuisine(snappedIndex); 
    }, 50);
}

// ==========================================
// 5. 渲染右側 (Dish Wheel)
// ==========================================
function renderDishWheel(cuisineKey) {
    dishWheel.innerHTML = '';
    dishWheel.style.transition = 'none';
    dishWheel.style.transform = 'rotate(0deg)';
    dishWheel.dataset.rotation = 0;
    void dishWheel.offsetWidth;
    dishWheel.style.transition = 'transform 1s cubic-bezier(0.23, 1, 0.32, 1)';

    const recipes = RECIPES_BY_CUISINE[cuisineKey] || [];
    const filledRecipes = fillArrayToCount(recipes, WHEEL_SLOTS);
    
    filledRecipes.forEach((recipe, index) => {
        const angle = index * ANGLE_PER_SLOT;
        const el = document.createElement('div');
        el.className = 'image-item';
        el.style.setProperty('--angle', `${angle}deg`);
        const img = document.createElement('img');
        img.src = recipe.imageUrl;
        el.appendChild(img);
        dishWheel.appendChild(el);
    });
}

// ==========================================
// 6. Spin 按鈕與過場流程
// ==========================================
function updateCenterPanel() {
    displayTitle.textContent = currentCuisine.toUpperCase();
    const recipes = RECIPES_BY_CUISINE[currentCuisine] || [];
    const previewNames = recipes.slice(0, 3).map(r => r.name).join(', ');
    displayDesc.textContent = `Featuring ${previewNames} and more. Spin to decide!`;
}

spinBtn.addEventListener('click', () => {
    spinBtn.disabled = true;
    const recipes = RECIPES_BY_CUISINE[currentCuisine];
    const filledRecipes = fillArrayToCount(recipes, WHEEL_SLOTS);
    
    // 1. 決定結果
    const winIndex = Math.floor(Math.random() * WHEEL_SLOTS);
    const winRecipe = filledRecipes[winIndex];

    // 2. 第一頁轉盤動畫
    const targetRot = (-1 * winIndex * ANGLE_PER_SLOT) + 180 - (360 * 3);
    dishWheel.style.transform = `rotate(${targetRot}deg)`;
    dishWheel.dataset.rotation = targetRot;

    // 3. 進入過場動畫 (Matter.js)
    setTimeout(() => {
        screenAnimation.classList.remove('hidden');
        
        // 啟動物理引擎
        initPhysicsWorld();

        // 4. 動畫結束後顯示結果 (設定為 3.5 秒)
        setTimeout(() => {
            showResult(winRecipe);
            screenAnimation.classList.add('hidden');
            // 清理物理引擎
            clearPhysicsWorld();
        }, 3500);

    }, 1200);
});

// ==========================================
// 7. Matter.js 物理引擎邏輯 (過場動畫)
// ==========================================
function initPhysicsWorld() {
    engine = Engine.create();
    world = engine.world;

    const container = document.getElementById('falling-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent'
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // 建立地板與牆壁
    const ground = Bodies.rectangle(width / 2, height + 30, width, 60, { isStatic: true });
    const leftWall = Bodies.rectangle(-30, height / 2, 60, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + 30, height / 2, 60, height * 2, { isStatic: true });
    World.add(world, [ground, leftWall, rightWall]);

    // 建立掉落物體
    const itemCount = 40; // 掉落數量
    const balls = [];

    for (let i = 0; i < itemCount; i++) {
        const radius = Math.random() * 30 + 90; // 30-60px
        
    // 隨機從 FALLING_FOOD_FILES 列表中選一張圖片並使用安全 URL
    const randomFile = FALLING_FOOD_FILES[Math.floor(Math.random() * FALLING_FOOD_FILES.length)];
    const textureUrl = getSafeTextureUrl(randomFile);
        
        const ball = Bodies.circle(
            Math.random() * width,
            Math.random() * -500 - 50, // 從上方隨機高度掉落
            radius,
            {
                restitution: 0.5,
                friction: 0.1,
                render: {
                    sprite: {
                        texture: textureUrl,
                        // 假設圖片原始大小約 200px，根據半徑縮放
                        xScale: (radius * 2) / 200, 
                        yScale: (radius * 2) / 200
                    }
                }
            }
        );
        balls.push(ball);
    }

    World.add(world, balls);
}

function clearPhysicsWorld() {
    if (render) {
        Render.stop(render);
        World.clear(engine.world);
        Engine.clear(engine);
        render.canvas.remove();
        render.canvas = null;
        render.context = null;
        render.textures = {};
    }
    if (runner) {
        Runner.stop(runner);
    }
}

// ==========================================
// 8. 顯示結果頁
// ==========================================
function showResult(recipe) {
    resultImage.src = recipe.imageUrl;
    resultTitle.textContent = recipe.name;
    resultDesc.textContent = recipe.description;
    
    // let price = Math.floor(Math.random() * 25 + 15);
    // price = Math.random() > 0.5 ? price + 0.99 : price;
    // resultPrice.textContent = '$' + price.toFixed(2);
    
    screen3.classList.remove('hidden');
    spinBtn.disabled = false;
}

backBtn.addEventListener('click', () => {
    screen3.classList.add('hidden');
    screenAnimation.classList.add('hidden');
    clearPhysicsWorld();
});

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        alert("Shared to " + btn.innerText);
    });
});

// 初始化
renderCuisineWheel();
renderDishWheel(currentCuisine);
updateCenterPanel();