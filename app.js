const form = document.getElementById("lookup-form");
const result = document.getElementById("result");
const resultMeta = document.getElementById("result-meta");
const resultError = document.getElementById("result-error");
const resultList = document.getElementById("result-list");

let records = [];

loadData();

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
  const normalized = String(value).trim().replace(/[^\d.]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}
