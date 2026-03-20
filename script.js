const jpyAmountInput = document.getElementById('jpyAmount');
const inputError = document.getElementById('inputError');
const twdAmountDiv = document.getElementById('twdAmount');
const feeDiv = document.getElementById('fee');
const convertedAmountDiv = document.getElementById('convertedAmount');
const rateTimestampDiv = document.getElementById('rateTimestamp');
const nowRateDiv = document.getElementById('nowRate');
const loadingDiv = document.getElementById('loading');
const container = document.querySelector('.container');

// API 配置
const API_KEY = '92b4ac42a4b73d411d9b0c2b';
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/JPY`;
const CACHE_KEY = 'jpy_twd_rate_cache';
const CACHE_EXPIRY = 3600000; // 1 小時 (毫秒)

let exchangeRate = null;
let lastUpdate = null;

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    // 監聽輸入事件實現即時轉換
    jpyAmountInput.addEventListener('input', convertCurrency);
    // 初始化應用程式並讀取快取
    initApp();
});

async function initApp() {
    const cachedData = getCachedRate();
    
    if (cachedData) {
        console.log("使用快取匯率資料");
        exchangeRate = cachedData.rate;
        lastUpdate = cachedData.timestamp;
        updateRateDisplay();
        loadingDiv.style.display = 'none';
    } else {
        await fetchExchangeRate();
    }
}

function getCachedRate() {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) return null;

    try {
        const { rate, timestamp, expiry } = JSON.parse(cache);
        const now = new Date().getTime();

        // 檢查是否過期
        if (now > expiry) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return { rate, timestamp };
    } catch (e) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

function saveRateToCache(rate, timestamp) {
    const now = new Date().getTime();
    const cacheData = {
        rate: rate,
        timestamp: timestamp,
        expiry: now + CACHE_EXPIRY
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

function presetAmount(amount) {
    jpyAmountInput.value = amount;
    convertCurrency();
}

function clearInput() {
    jpyAmountInput.value = '';
    inputError.innerHTML = '';
    const spans = document.querySelectorAll('.output-item span');
    spans.forEach(span => span.textContent = '-');
}

function formatNumber(num) {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(num);
}

async function fetchExchangeRate() {
    loadingDiv.style.display = 'block';
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        exchangeRate = data.conversion_rates.TWD;
        lastUpdate = data.time_last_update_unix * 1000;
        
        saveRateToCache(exchangeRate, lastUpdate);
        updateRateDisplay();
        loadingDiv.style.display = 'none';
    } catch (error) {
        console.error("Error:", error);
        inputError.innerHTML = "無法取得即時匯率，請稍後再試。";
        loadingDiv.style.display = 'none';
    }
}

function updateRateDisplay() {
    if (exchangeRate) {
        nowRateDiv.innerHTML = `目前匯率: <strong>${exchangeRate}</strong>`;
        rateTimestampDiv.innerHTML = `更新時間: <strong>${formatDateWithTimezone(lastUpdate)}</strong>`;
    }
}

function formatDateWithTimezone(timestamp) {
    const options = {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return new Intl.DateTimeFormat('zh-TW', options).format(new Date(timestamp));
}

function showResult(twdAmount, fee, convertedAmount) {
    twdAmountDiv.querySelector('span').innerHTML = `<strong>${formatNumber(twdAmount)}</strong>`;
    feeDiv.querySelector('span').innerHTML = `<strong>${formatNumber(fee)}</strong>`;
    convertedAmountDiv.querySelector('span').innerHTML = `<strong>${formatNumber(convertedAmount)}</strong>`;
}

function convertCurrency() {
    const jpyAmount = parseFloat(jpyAmountInput.value);
    inputError.innerHTML = '';

    if (!jpyAmount || jpyAmount <= 0) {
        if (jpyAmountInput.value !== "") {
            inputError.innerHTML = "請輸入有效的數值!";
        }
        showResult(0, 0, 0);
        return;
    }

    if (!exchangeRate) {
        inputError.innerHTML = "匯率載入中，請稍候...";
        return;
    }

    const twdAmount = (jpyAmount * exchangeRate);
    const fee = (twdAmount * 0.015);
    const convertedAmount = twdAmount + fee;

    showResult(twdAmount, fee, convertedAmount);
}
