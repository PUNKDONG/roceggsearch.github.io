const form = document.getElementById("lookup-form");
const result = document.getElementById("result");
const resultMeta = document.getElementById("result-meta");
const resultError = document.getElementById("result-error");
const resultList = document.getElementById("result-list");
const toggleSubmitButton = document.getElementById("toggle-submit");
const submitForm = document.getElementById("submit-form");
const submitMessage = document.getElementById("submit-message");
const submitCaptcha = document.getElementById("submit-captcha");
const captchaLabel = document.getElementById("captcha-label");

const SUBMIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbwO0AnLWpDflmF5GeFOiLBerdzRkAcchac5dwD2jvZxLWPZ4YWa0p9hxjPkfFes6WU3/exec";
const DUPLICATE_KEY = "rocegg-last-submit";
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

let records = [];
let captchaAnswer = null;

loadData();
refreshCaptcha();

toggleSubmitButton.addEventListener("click", () => {
  const willShow = submitForm.classList.contains("hidden");
  submitForm.classList.toggle("hidden");
  submitMessage.classList.add("hidden");
  toggleSubmitButton.textContent = willShow ? "收起提交表单" : "提交新数据";
  if (willShow) {
    refreshCaptcha();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const height = parseNumber(document.getElementById("height").value);
  const weight = parseNumber(document.getElementById("weight").value);

  result.classList.remove("hidden");
  resultError.classList.add("hidden");
  resultList.innerHTML = "";

  if (height === null || weight === null) {
    resultMeta.textContent = "";
    resultError.textContent = "请输入合法的身高和体重数值";
    resultError.classList.remove("hidden");
    return;
  }

  const pets = lookupPets(height, weight);
  resultMeta.textContent = `身高 ${height}，体重 ${weight}，共找到 ${pets.length} 个结果`;

  if (!pets.length) {
    const item = document.createElement("li");
    item.textContent = "没有匹配结果，请检查输入是否正确。";
    resultList.appendChild(item);
    return;
  }

  pets.forEach((pet) => {
    const item = document.createElement("li");
    item.textContent = pet;
    resultList.appendChild(item);
  });
});

async function loadData() {
  try {
    const response = await fetch("./data/pets.csv");
    const text = await response.text();
    records = parseCsv(text);
  } catch (error) {
    result.classList.remove("hidden");
    resultError.textContent = "图鉴数据加载失败";
    resultError.classList.remove("hidden");
  }
}

function lookupPets(height, weight) {
  const pets = [];

  for (const record of records) {
    if (height < record.minHeight || height > record.maxHeight) {
      continue;
    }
    if (weight < record.minWeight || weight > record.maxWeight) {
      continue;
    }
    if (!pets.includes(record.name)) {
      pets.push(record.name);
    }
  }

  return pets;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.slice(1).map((line) => {
    const [minHeight, maxHeight, minWeight, maxWeight, name] = line.split(",");
    return {
      minHeight: Number(minHeight),
      maxHeight: Number(maxHeight),
      minWeight: Number(minWeight),
      maxWeight: Number(maxWeight),
      name: name.trim()
    };
  });
}

function parseNumber(value) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const height = parseNumber(document.getElementById("submit-height").value);
  const weight = parseNumber(document.getElementById("submit-weight").value);
  const name = document.getElementById("submit-name").value.trim();
  const captchaValue = parseNumber(submitCaptcha.value);

  submitMessage.className = "submit-message";

  const validationError = validateSubmission(height, weight, name, captchaValue);
  if (validationError) {
    submitMessage.textContent = validationError;
    submitMessage.classList.add("error");
    submitMessage.classList.remove("hidden");
    return;
  }

  if (isDuplicateSubmission(height, weight, name)) {
    submitMessage.textContent = "相同内容刚刚提交过，请勿重复上传";
    submitMessage.classList.add("error");
    submitMessage.classList.remove("hidden");
    refreshCaptcha();
    return;
  }

  submitMessage.textContent = "上传中...";
  submitMessage.classList.remove("hidden");

  try {
    const response = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        height: String(height),
        weight: String(weight),
        name
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "上传失败");
    }

    rememberSubmission(height, weight, name);
    submitMessage.textContent = "上传成功，已记录到表格";
    submitMessage.classList.add("success");
    submitForm.reset();
    submitForm.classList.add("hidden");
    toggleSubmitButton.textContent = "提交新数据";
    refreshCaptcha();
  } catch (error) {
    submitMessage.textContent = error.message || "上传失败";
    submitMessage.classList.add("error");
    refreshCaptcha();
  }
});

function validateSubmission(height, weight, name, captchaValue) {
  if (height === null || weight === null || !name || captchaValue === null) {
    return "请完整填写身高、体重、名称和验证码";
  }

  if (!(height > 0 && height <= 100)) {
    return "身高请输入 0 到 100 之间的数字";
  }

  if (!(weight > 0 && weight <= 1000)) {
    return "体重请输入 0 到 1000 之间的数字";
  }

  if (!/^[\u4e00-\u9fa5A-Za-z0-9·_\-\s]{2,12}$/.test(name)) {
    return "名称长度需为 2 到 12，且不能包含特殊符号";
  }

  if (/^\d+$/.test(name)) {
    return "名称不能是纯数字";
  }

  if (captchaValue !== captchaAnswer) {
    return "验证码不正确";
  }

  return "";
}

function refreshCaptcha() {
  const left = randomInt(1, 9);
  const right = randomInt(1, 9);
  captchaAnswer = left + right;
  captchaLabel.textContent = `验证码：${left} + ${right} = ?`;
  submitCaptcha.value = "";
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isDuplicateSubmission(height, weight, name) {
  try {
    const raw = localStorage.getItem(DUPLICATE_KEY);
    if (!raw) {
      return false;
    }

    const saved = JSON.parse(raw);
    if (Date.now() - saved.time > DUPLICATE_WINDOW_MS) {
      return false;
    }

    return saved.height === height && saved.weight === weight && saved.name === name;
  } catch (error) {
    return false;
  }
}

function rememberSubmission(height, weight, name) {
  try {
    localStorage.setItem(DUPLICATE_KEY, JSON.stringify({
      height,
      weight,
      name,
      time: Date.now()
    }));
  } catch (error) {
    // Ignore storage failures and keep submission flow usable.
  }
}
