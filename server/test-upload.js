const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('textResponse', 'test via script');
    
    // Create a dummy image file
    fs.writeFileSync('dummy.jpg', 'dummy image content');
    form.append('file', fs.createReadStream(path.join(__dirname, 'dummy.jpg')));

    const res = await axios.post('http://localhost:5000/api/lms/lessons/cmsef87cu0009cwzfv0nmw4wg/homework', form, {
      headers: { 
        ...form.getHeaders(),
        Authorization: 'Bearer test' // Note: This will probably fail 401, but we just want to see if the file is passed
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

testUpload();
