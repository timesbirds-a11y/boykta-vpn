require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Verification Endpoint
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Message Receiver Endpoint
app.post('/webhook', async (req, res) => {
  const { body } = req;

  if (body.object === 'page') {
    body.entry.forEach(async (entry) => {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function handleMessage(senderPsid, receivedMessage) {
  if (!receivedMessage.text) return;
  const text = receivedMessage.text.toLowerCase();

  if (text.includes('عروض') || text.includes('انترنت')) {
    await sendOffersMenu(senderPsid);
  } else if (text.includes('رصيد') || text.includes('تعبئة')) {
    await sendFlexiInfo(senderPsid);
  } else {
    const welcomePayload = {
      text: "أهلاً بك 👋 في دليل عروض جيزي!\nاختر من القائمة أدناه ما تريد معرفته:",
      quick_replies: [
        { content_type: "text", title: "🌐 عروض الإنترنت", payload: "OFFERS" },
        { content_type: "text", title: "💳 كود الرصيد", payload: "BALANCE" }
      ]
    };
    await sendApi(senderPsid, welcomePayload);
  }
}

async function handlePostback(senderPsid, receivedPostback) {
  const payload = receivedPostback.payload;

  if (payload === 'OFFERS') {
    await sendOffersMenu(senderPsid);
  } else if (payload === 'ACTIVATE_SPECIAL') {
    await sendApi(senderPsid, { text: "للاشتراك في عرض Special 1000 اتصل بـ *720# أو عبر تطبيق Djezzy App." });
  } else if (payload === 'ACTIVATE_HAFLA') {
    await sendApi(senderPsid, { text: "للاشتراك في باقات Hafla اتصل بـ *707#." });
  }
}

async function sendOffersMenu(senderPsid) {
  const responsePayload = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: 'عرض Djezzy Special 1000',
            subtitle: '15 جيغا إنترنت + مكالمات غير محدودة شهرياً | 1000 دج',
            buttons: [{ type: 'postback', title: 'طريقة التفعيل', payload: 'ACTIVATE_SPECIAL' }]
          },
          {
            title: 'باقات Djezzy Hafla',
            subtitle: 'عروض إنترنت مضاعفة ومكالمات يومية وأسبوعية',
            buttons: [{ type: 'postback', title: 'طريقة التفعيل', payload: 'ACTIVATE_HAFLA' }]
          }
        ]
      }
    }
  };
  await sendApi(senderPsid, responsePayload);
}

async function sendFlexiInfo(senderPsid) {
  const infoText = "📌 أكواد جيزي الأساسية:\n\n" +
                   "• لمعرفة الرصيد: *710#\n" +
                   "• لتعبئة بطاقة الفليكسي: *700# ثم الرقم ثم #\n" +
                   "• تحويل الرصيد: *770#الرقم#المبلغ#\n" +
                   "• معرفة رقم الهاتف: *99#";
  await sendApi(senderPsid, { text: infoText });
}

async function sendApi(senderPsid, response) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderPsid },
        message: response
      }
    );
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
