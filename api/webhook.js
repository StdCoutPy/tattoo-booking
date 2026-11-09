export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body;

        if (!body.callback_query) {
            return res.status(200).json({ status: 'ignored_not_callback' });
        }

        const callbackQuery = body.callback_query;
        const callbackData = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        const [action, recordId, masterId] = callbackData.split(':');

        const mastersConfig = {
            "leha_ink": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" },
            "ilya_tattoo": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" },
            "default_master": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" }
        };
        const masterSettings = mastersConfig[masterId] || mastersConfig["default_master"];

        // 🔥 НАМЕРТВО УБРАЛИ КЛЮЧ ИЗ КОДА. Теперь тут чистые системные переменные Vercel:
        const SUPABASE_URL = "https://supabase.co";
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        let updatedText = "";

        if (action === 'accept') {
            updatedText = callbackQuery.message.text + "\n\n✅ <b>ЗАПИСЬ ПОДТВЕРЖДЕНА МАСТЕРОМ</b>";
        }
        else if (action === 'reject') {
            const deleteResponse = await fetch(`${SUPABASE_URL}?id=eq.${recordId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (deleteResponse.ok) {
                updatedText = `❌ <b>Запись отменена. Клиент автоматически удален из базы данных Supabase.</b>`;
            } else {
                updatedText = callbackQuery.message.text + `\n\n⚠️ Ошибка удаления из базы (Код: ${deleteResponse.status})`;
            }
        }

        await fetch(`https://telegram.org{masterSettings.token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: updatedText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] }
            })
        });

        await fetch(`https://telegram.org{masterSettings.token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("💥 Ошибка Vercel бэкенда:", error);
        return res.status(500).json({ error: error.message });
    }
}
