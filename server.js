const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load car data
// const carsDataPath = path.join(__dirname,'allCars.json');
// const carsDataPath = path.join(__dirname,'allCarsSarSort.json');
// const carsDataPath = path.join(__dirname,'allCarsSarSortEnglish.json');
// const carsDataPath = path.join(__dirname,'cars-2025.json');
// const carsDataPath = path.join(__dirname,'sorted_cars_by_popularity.json');
// const carsDataPath = path.join(__dirname,'cars_sorted_by_manufacturer_order.json');
const carsDataPath = path.join(__dirname,'carsData.json');
const carsData = JSON.parse(fs.readFileSync(carsDataPath, 'utf8'));



// Allow CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});



// get from . env file
require('dotenv').config();
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_PUBLIC_KEY = process.env.MOYASAR_PUBLIC_KEY;


const MAIN_WHATSAPP_API=process.env.MAIN_WHATSAPP_API
const MAIN_WHATSAPP_API_EMAIL=process.env.MAIN_WHATSAPP_API_EMAIL
const MAIN_WHATSAPP_API_PASSWORD=process.env.MAIN_WHATSAPP_API_PASSWORD
const MAIN_WHATSAPP_API_TOKEN=process.env.MAIN_WHATSAPP_API_TOKEN











// console.log('Moyasar Secret Key:', MOYASAR_SECRET_KEY);
// console.log('Moyasar Public Key:', MOYASAR_PUBLIC_KEY);

// Moyasar configuration
// const MOYASAR_SECRET_KEY = 'sk_test_NBFV7v8yUSinTnTcRaNRW9pemTM6xuBUTGMMGTZV';
// const MOYASAR_PUBLIC_KEY = 'pk_test_EysVWZ4Y48wwi17rifqMegSZPVivU4p2HCJsWFWC';


// API Endpoints

// Get all manufacturers
app.get('/api/manufacturers', (req, res) => {
  const manufacturers = [...new Set(carsData.map(car => car.manufacturer))].sort();
  res.json(manufacturers);
});

// Get models by manufacturer
app.get('/api/models/:manufacturer', (req, res) => {
  const manufacturer = req.params.manufacturer;
  const models = [...new Set(
    carsData
      .filter(car => car.manufacturer === manufacturer)
      .map(car => car.model)
  )].sort();
  res.json(models);
});

// Get submodels by manufacturer and model
app.get('/api/submodels/:manufacturer/:model', (req, res) => {
  const { manufacturer, model } = req.params;
  const subModels = [...new Set(
    carsData
      .filter(car => car.manufacturer === manufacturer && car.model === model)
      .map(car => car.sub_model)
      .filter(Boolean)
  )].sort();
  res.json(subModels);
});

// Get years by manufacturer and model (with optional submodel as query parameter)
app.get('/api/years/:manufacturer/:model', (req, res) => {
  const { manufacturer, model } = req.params;
  const subModel = req.query.submodel || null;
  
  let filteredCars = carsData.filter(
    car => car.manufacturer === manufacturer && car.model === model
  );
  
  if (subModel) {
    filteredCars = filteredCars.filter(car => car.sub_model === subModel);
  }
  
  const years = [...new Set(filteredCars.map(car => car.production_year))]
    .sort((a, b) => b - a);
  
  res.json(years);
});







/************************************************************* */

const dataMap = {
  manufacturers: new Set(),
  modelsByManufacturer: {},
  subModelsByModel: {},
  yearsByModel: {}
};

// Preprocess data ONCE when the server starts
carsData.forEach(car => {
  const { manufacturer, model, sub_model, production_year } = car;

  dataMap.manufacturers.add(manufacturer);

  if (!dataMap.modelsByManufacturer[manufacturer]) {
    dataMap.modelsByManufacturer[manufacturer] = new Set();
  }
  dataMap.modelsByManufacturer[manufacturer].add(model);

  if (!dataMap.subModelsByModel[model]) {
    dataMap.subModelsByModel[model] = new Set();
  }
  dataMap.subModelsByModel[model].add(sub_model);

  if (!dataMap.yearsByModel[model]) {
    dataMap.yearsByModel[model] = new Set();
  }
  dataMap.yearsByModel[model].add(production_year);
});


console.log('Data map initialized:', {
  manufacturers: [...dataMap.manufacturers].length,
  modelsByManufacturer: Object.keys(dataMap.modelsByManufacturer).length,
  subModelsByModel: Object.keys(dataMap.subModelsByModel).length,
  yearsByModel: Object.keys(dataMap.yearsByModel).length
});

//  print first 10 cars data
// console.log('First 10 cars data:', carsData.slice(0, 10).map(car => ({
//   manufacturer: car.manufacturer,
//   model: car.model,
//   sub_model: car.sub_model,
//   production_year: car.production_year
// })));









// Endpoints

app.get('/api/v1/manufacturers', (req, res) => {

  // ?allFrom=2020
  const { allFrom } = req.query;
  if (allFrom) {
    const filteredManufacturers = [...dataMap.manufacturers].filter(manufacturer => {
      return carsData.some(car => car.manufacturer === manufacturer && car.production_year >= allFrom);
    });
    return res.json(filteredManufacturers);
  }

  res.json([...dataMap.manufacturers]);
});



app.get('/api/v1/years', (req, res) => {
  const { manufacturer, model, submodel } = req.query;

  if (!manufacturer) {
    return res.status(400).json({ error: 'Manufacturer are required' });
  }

  let years = carsData
    .filter(car => car.manufacturer === manufacturer)
    .map(car => car.production_year);

  res.json([...new Set(years)].sort((a, b) => b - a));
});



app.get('/api/v1/models', (req, res) => {
  const { manufacturer, year } = req.query;

  if (!manufacturer) {
    return res.status(400).json({ error: 'Manufacturer and year is required' });
  }

  let models = [...dataMap.modelsByManufacturer[manufacturer] || []];

  if (year) {
    models = models.filter(model => 
      carsData.some(car => car.manufacturer === manufacturer && car.model === model && car.production_year == year)
    );
  }

  res.json(models);
});

// app.get('/api/v1/sub-models', (req, res) => {
//   const { model } = req.query;
//   res.json([...dataMap.subModelsByModel[model] || []]);
// });

// app.get('/api/v1/years', (req, res) => {
//   const { model } = req.query;
//   res.json([...dataMap.yearsByModel[model] || []]);
// });


app.get('/api/v1/sub-models', (req, res) => {
  const { manufacturer, model, year } = req.query;

  if (!manufacturer || !model) {
    return res.status(400).json({ error: 'Manufacturer and model are required' });
  }

  let filteredCars = carsData.filter(car => car.manufacturer === manufacturer && car.model === model);

  if (year) {
    filteredCars = filteredCars.filter(car => car.production_year == year);
  }

  const subModels = filteredCars
    .map(car => car.sub_model)
    .filter(Boolean);

  res.json([...new Set(subModels)]);
});




/************************************************************* */













// Get filtered cars
app.get('/api/cars', (req, res) => {
  const { manufacturer, model, subModel, year } = req.query;
  
  // console.log('Query parameters:', req.query);

  if (!manufacturer && !model ) {
    return res.status(400).json({ error: 'At least manufacturer and model is required' });
  }

  let filteredCars = carsData;
  
  if (manufacturer) filteredCars = filteredCars.filter(c => c.manufacturer === manufacturer);
  if (model) filteredCars = filteredCars.filter(c => c.model === model);
  if (subModel) filteredCars = filteredCars.filter(c => c.sub_model === subModel);
  if (year) filteredCars = filteredCars.filter(c => c.production_year == year);
  
  res.json(filteredCars);
});











// Verify payment endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { email, phone, carId, paymentId } = req.body;

    // Verify payment with Moyasar API
    const paymentResponse = await axios.get(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      auth: {
        username: MOYASAR_SECRET_KEY,
        password: ''
      }
    });

    const payment = paymentResponse.data;
    console.log('Payment verification response:', payment);
    
    if (payment.status !== 'paid' ) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment not completed' 
      });
    }

    // Find the car
    const car = carsData.find(c => c.id == carId);
    if (!car) {
      return res.status(404).json({ 
        success: false,
        error: 'Car not found' 
      });
    }

    // Calculate fees
    const basePrice = car.depreciated_value;
    const customsFee = basePrice * 0.05;
    const totalBeforeVat = basePrice + customsFee;
    const vatFee = totalBeforeVat * 0.15;
    const totalPrice = totalBeforeVat + vatFee;

    // Prepare response
    const response = {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at
      },
      customer: {
        email,
        phone
      },
      car: {
        manufacturer: car.manufacturer,
        model: car.model,
        subModel: car.sub_model || null,
        year: car.production_year,
        originalValue: car.original_value,
        depreciatedValue: car.depreciated_value
      },
      calculation: {
        basePrice,
        customsFee,
        totalBeforeVat,
        vatFee,
        totalPrice
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: 'Payment verification failed',
      details: error.response?.data || error.message
    });
  }
});







// Save payment endpoint using SQLite3
const dbPath = path.join(__dirname, 'payments.db');

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refId TEXT NOT NULL,
                payment TEXT NOT NULL,
                data TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }
});

// Save payment endpoint
app.post('/api/save-payment', (req, res) => {
    try {
        const { payment, refId,data } = req.body;

        if (!refId || !payment || !data) {
            console.error('Missing required fields:', { refId, payment, data });
            return res.status(400).json({ success: false, error: 'refId and payment and data are required' });
        }

        const timestamp = new Date().toISOString();
        const paymentString = JSON.stringify(payment);

        const query = `
            INSERT INTO payments (refId, payment, data, timestamp)
            VALUES (?, ?, ?, ?)
        `;

        const dataString = JSON.stringify(data);

        db.run(query, [refId, paymentString, dataString, timestamp], function (err) {
            if (err) {
                console.error('Error saving payment:', err.message);
                return res.status(500).json({ success: false, error: 'Failed to save payment' });
            }

            res.json({ success: true, message: 'Payment saved successfully', paymentId: this.lastID });
        });
    } catch (error) {
        console.error('Error saving payment:', error.message);
        res.status(500).json({ success: false, error: 'Failed to save payment' });
    }
});


// Get payment by reference ID and verify status with Moyasar
app.get('/api/get-payment', async (req, res) => {
    try {
        const { ref } = req.query;

        // console.log('Received reference ID:', ref);

        if (!ref) {
            return res.status(400).json({ success: false, error: 'Reference ID is required' });
        }

        // Query the database for the payment by reference ID
        const query = `SELECT * FROM payments WHERE refId = ?`;

        db.get(query, [ref], async (err, row) => {
            if (err) {
                console.error('Error fetching payment from database:', err.message);
                return res.status(500).json({ success: false, error: 'Failed to fetch payment' });
            }

            if (!row) {
                return res.status(404).json({ success: false, error: 'Payment not found' });
            }

            // console.log('Payment found in database:', row);

            const payment = JSON.parse(row.payment);

            // Verify payment status with Moyasar API
            const paymentResponse = await axios.get(`https://api.moyasar.com/v1/payments/${payment.id}`, {
                auth: {
                    username: MOYASAR_SECRET_KEY,
                    password: ''
                }
            });

            // console.log('Payment verification response:', paymentResponse.data);

            const moyasarPayment = paymentResponse.data;

            if (moyasarPayment.status !== 'paid') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Payment not completed', 
                    paymentStatus: moyasarPayment.status 
                });
            }


            console.log("paymentData" , JSON.parse(row.data));


            // get full car data from carsData using the car details from paymentData
            const carDetails = JSON.parse(row.data).car_details;
            const cars = carsData.filter(c => 
                c.manufacturer === carDetails.manufacturer && 
                c.model === carDetails.model && 
                c.sub_model === carDetails.sub_model && 
                c.production_year == carDetails.year
            );
            if (!cars) {
              console.log('Car not found in carsData:', carDetails);
            }
            // console.log('Car found in carsData:', cars);

  
            console.log("phoneNumber",JSON.parse(row.data).whatsapp);

            // Calculate fees for the filtered cars
            const feesBreakdown =   calculateFeesForCars(cars,JSON.parse(row.data).whatsapp,ref);

            // console.log('Fees Breakdown:', feesBreakdown);



            res.json({ 
                success: true, 
                paymentResponse: paymentResponse.data, 
                paymentStatus: moyasarPayment.status, 
                paymentData: JSON.parse(row.data),
                feesBreakdown: feesBreakdown,
            });
        });
    } catch (error) {
        console.error('Error fetching payment by reference ID:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch payment', details: error.response?.data || error.message });
    }
});





// Function to calculate fees for multiple cars and return breakdown as a styled message in Arabic (Saudi dialect)
function calculateFeesForCars(cars,phoneNumber,ref) {
  if (cars.length === 0) {
    return {
      title: 'لم يتم العثور على سيارات',
      message: 'عذرًا، لم يتم العثور على سيارات مطابقة للبيانات المدخلة.',
      type: 'error',
      whatsappText: 'عذرًا، لم يتم العثور على سيارات مطابقة للبيانات المدخلة.'
    };
  }

  const { manufacturer, model, sub_model, production_year, chassis_number } = cars[0];
  let breakdown = `

    <h2 class="section-title">نتيجة الحساب</h2>
    
    <div id="carInfo" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">

      <div class="logoDivDad" style="display: flex; justify-content: space-between; margin-bottom: 10px;">


        <div>
          <div style="font-weight: 600; margin-bottom: 5px; font-weight: bold;">بيانات السيارة:</div>
          <div id="carDetails" style="margin-top: 10px;">
            <div style="margin-bottom: 8px;"><strong>الماركة:</strong> ${manufacturer}</div>
            <div style="margin-bottom: 8px;"><strong>الموديل:</strong> ${model}</div>
            <div style="margin-bottom: 8px;"><strong>الطراز الفرعي:</strong> ${sub_model || 'غير متوفر'}</div>
            <div style="margin-bottom: 8px;"><strong>سنة الإنتاج:</strong> ${production_year}</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <img src="./logo.jpg" alt="Logo" style="width: auto;  height: auto;  max-height: 130px; border-radius: 50%;  border: 3px solid black;">
          <h2 style="font-size: 1rem; margin: 0;">(مزايا الحلول .. نقول ..ونطووول)</h2>
        </div>


      </div>


      <hr>
  `;

  let whatsappText = `


  شكراً لاستخدامك حاسبة الرسوم الجمركية للسيارات.
  إليك بيانات فاتورتك بالتفصيل:
 
  --------------------
  بيانات السيارة:
  الماركة: ${manufacturer}
  الموديل: ${model}
  الطراز الفرعي: ${sub_model || 'غير متوفر'}
  سنة الإنتاج: ${production_year}

  --------------------
  تفاصيل الضريبة:
  --------------------
  `;

  cars.forEach((car, index) => {
    const { original_value,full_chassis } = car;

    // Calculate fees
    const customsFee = original_value * 0.05; // 5% customs fee
    const totalBeforeVat = original_value + customsFee;
    const vatFee = totalBeforeVat * 0.15; // 15% VAT
    const totalFees = customsFee + vatFee;

    // Append breakdown for each car
    breakdown += `
    <div class="result-item">
      <span class="result-label">(فئة السيارة) رقم الشاسية:</span>
      <span class="result-value">${full_chassis}</span>
    </div>
    <div class="result-item">
      <span class="result-label">سعر السيارة:</span>
      <span class="result-value">${original_value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}</span>
    </div>
    <div class="result-item">
      <span class="result-label">الرسوم الجمركية (5%):</span>
      <span class="result-value">${customsFee.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}</span>
    </div>
    <div class="result-item">
      <span class="result-label">الإجمالي قبل الضريبة:</span>
      <span class="result-value">${totalBeforeVat.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}</span>
    </div>
    <div class="result-item">
      <span class="result-label">ضريبة القيمة المضافة (15%):</span>
      <span class="result-value">${vatFee.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}</span>
    </div>
    <div class="result-item total">
      <span class="result-label">إجمالي الرسوم (جمارك + ضريبة):</span>
      <span class="result-value">${totalFees.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}</span>
    </div>
    <hr style="border: 1px solid #ddd; margin: 20px 0;">
    `;

    // whatsappText += `
    // السيارة ${index + 1}:
    // فئة السيارة (رقم الشاسية): ${full_chassis}
    // سعر السيارة: ${original_value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    // الرسوم الجمركية (5%): ${customsFee.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    // الإجمالي قبل الضريبة: ${totalBeforeVat.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    // ضريبة القيمة المضافة (15%): ${vatFee.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    // إجمالي الرسوم (جمارك + ضريبة): ${totalFees.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
    // --------------------
    // `;


    whatsappText += `
السيارة ${index + 1}:
فئة السيارة (رقم الشاسية): ${full_chassis}
إجمالي الرسوم (جمارك + ضريبة): ${totalFees.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
--------------------
    `;



  });

  whatsappText+=`

  ملاحظة هامة:
  الرسوم الجمركية والضريبية تحسب بناءً على القيمة الأصلية (التسعيرة الافتراضية) للسيارة التي تحددها الدولة،
  وليس بناءً على سعر الشراء الفعلي. وذلك لضمان تحصيل الرسوم بشكل عادل وثابت.

  يمكنك الاستعلام عن المزيد عن طريق موقعنا
  (https://mazayacars.site)

  `;




  breakdown += `
    <div style="margin-top: 20px; padding: 15px; background: rgb(248, 249, 250); border-radius: 8px;">
      <p style="font-weight: 600; margin-bottom: 5px;">ملاحظة هامة:</p>
      <p style="font-size: 0.9rem; margin: 0;">
        الرسوم الجمركية والضريبية تحسب بناءً على القيمة الأصلية (التسعيرة الافتراضية) للسيارة التي تحددها الدولة، 
        وليس بناءً على سعر الشراء الفعلي. وذلك لضمان تحصيل الرسوم بشكل عادل وثابت.
      </p>
    </div>
    <div class="action-buttons" style="margin-top: 30px;">
      <button class="btn-secondary" id="backToCalculator">العودة إلى الحاسبة</button>
      <button class="btn-secondary" id="printBtn">طباعة النتيجة</button>
    </div>
  </div>
  `;


  // console.log("phoneNumber",phoneNumber);


  sendMessageToWhatsApp(phoneNumber,whatsappText.trim(),ref);






  return {
    title: 'تفاصيل الرسوم',
    message: breakdown.trim(),
    type: 'success',
    whatsappText: whatsappText.trim()
  };
}



let phonesSendedWhatsAppMasseage = []; // Flag to track if it's the first time sending the message




// Function to send message to WhatsApp
function sendMessageToWhatsApp(phoneNumber, message,ref) {



  // Check if the message has already been sent to this phone number and reference ID
  if (phonesSendedWhatsAppMasseage.some(entry => entry.ref === ref && entry.phone === phoneNumber)) {
    console.log(`Message already sent to ${phoneNumber} with ref ${ref}. Skipping...`);
    return;
  }

  // Add the phone number and reference ID to the tracking array
  phonesSendedWhatsAppMasseage.push({ ref, phone: phoneNumber });

  
  // // Allow CORS for the WhatsApp message request
  // fetch("https://api.mazayacars.site/send-user-whatsapp-message/mazexcars@gmail.com?password=0123456456!&token=N5nHEd6BvJOJmcVS7UiG", {
  //   method: 'POST',
  //   mode: 'no-cors', // Added no-cors mode
  //   headers: {
  //    'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ phoneNumber, message: `${message}`, countryCode: `` }),
  //  })


  // Construct the URL from the environment variables
  const url = `${MAIN_WHATSAPP_API}/send-user-whatsapp-message/${MAIN_WHATSAPP_API_EMAIL}?password=${MAIN_WHATSAPP_API_PASSWORD}&token=${MAIN_WHATSAPP_API_TOKEN}`;

  // Send message using the /send-user-whatsapp-message endpoint
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber, message: `${message}`, countryCode: `` }),
  })
  .then(response => {
    if (response.ok) {
      console.log(`Message sent`);
    } else {
      console.error('Failed to send message:', response.status);
    }
  })
  .catch(error => {
    console.error('Fetch error:', error);
  });

   
}




// Serve static files
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});