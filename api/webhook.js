export default async function handler(req, res) {
    try {
        // УНИВЕРСАЛЬНЫЙ ПЕРЕХВАТ: читаем данные и из POST-тела, и из GET-параметров!
        const body = req.body || {};

        // 🔀 ЧАСТЬ А: Обработка клика по инлайн-кнопке в Telegram (Callback Query)
        if (body.callback_query) {
            const callbackQuery = body.callback_query;
            const callbackData = callbackQuery.data; // "accept:ID:master_id"
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;

            const [action, recordId, masterId] = callbackData.split(':');

            const mastersConfig = {
                "leha_ink": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" },
                "ilya_tattoo": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" },
                "default_master": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM" }
            };
            const masterSettings = mastersConfig[masterId] || mastersConfig["default_master"];

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

            // Обновляем текст в ТГ и скрываем инлайн-кнопки
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

            // Гасим часики на кнопке в ТГ
            await fetch(`https://telegram.org{masterSettings.token}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackQuery.id })
            });

            return res.status(200).json({ success: true });
        }

        // 📥 ЧАСТЬ Б: Обработка новой записи из базы данных Supabase
        // Поддерживаем оба формата, которые может прислать вебхук Supabase
        const record = body.record || req.query || null;

        if (!record || Object.keys(record).length === 0) {
            // Если пришел пустой тестовый пинг от Supabase, просто глушим его статусом 200
            return res.status(200).json({ status: 'ping_success' });
        }

        const mastersConfig = {
            "leha_ink": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM", "chat_id": "1769204894", "name": "Алексей (Графика)" },
            "ilya_tattoo": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM", "chat_id": "1769204894", "name": "Илья (Реализм)" },
            "default_master": { "token": "8613282141:AAFYwiQoT_ZnFK2M21rkttOIC-vzvmeyKTM", "chat_id": "1769204894", "name": "Центральная Студия" }
        };

        const currentMasterId = record.master_id || "default_master";
        const masterSettings = mastersConfig[currentMasterId] || mastersConfig["default_master"];

        const text = `💥 <b>Новая запись к мастеру: ${masterSettings.name}</b>\n\n` +
                     `👤 <b>Клиент:</b> ${record.name || 'Не указано'}\n` +
                     `📱 <b>Телефон:</b> ${record.phone || 'Не указано'}\n` +
                     `📅 <b>Дата:</b> ${record.date || 'Не указана'}\n` +
                     `⏰ <b>Время:</b> ${record.time || 'Не указано'}\n` +
                     `📝 <b>Идея:</b> ${record.note || 'Отсутствует'}`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Принять", callback_data: `accept:${record.id}:${currentMasterId}` },
                    { text: "❌ Отменить и Удалить", callback_data: `reject:${record.id}:${currentMasterId}` }
                ]
            ]
        };

        await fetch(`https://telegram.org{masterSettings.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: masterSettings.chat_id,
                text: text,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        });

        return res.status(200).json({ success: true, message: "Notification sent successfully" });

    } catch (error) {
        console.error("💥 Ошибка Vercel бэкенда:", error);
        return res.status(200).json({ error: error.message }); // Возвращаем 200, чтобы не вешать вебхук
    }
}
