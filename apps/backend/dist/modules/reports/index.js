import { db } from '@ghost/database';
import { summarizeText } from '../../core/ai.js';
export async function reportsModule(app) {
    app.get('/reports/daily', { preHandler: [app.authenticate] }, async (req) => {
        const { date } = req.query;
        const now = new Date();
        const reportDate = date
            ? new Date(date + 'T00:00:00.000Z')
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const rows = await db.message.findMany({
            where: {
                userId: req.userId,
                timestamp: {
                    gte: reportDate,
                    lt: nextDay,
                },
            },
        });
        const total = rows.length;
        const platforms = {};
        let outbound = 0, inbound = 0, voiceNotes = 0;
        for (const m of rows) {
            platforms[m.platform] = (platforms[m.platform] ?? 0) + 1;
            if (m.isOutgoing)
                outbound++;
            else
                inbound++;
            if (m.messageType === 'voice_note' || m.messageType === 'voice_processed')
                voiceNotes++;
        }
        let summary = null;
        if (total > 0) {
            const platformStr = Object.entries(platforms).map(([p, c]) => `${p}: ${c}`).join(', ');
            summary = `Laporan ${reportDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}: ${total} pesan (${outbound} terkirim, ${inbound} diterima) dari ${platformStr}. Voice note: ${voiceNotes}.`;
        }
        return {
            date: reportDate.toISOString().slice(0, 10),
            totalMessages: total,
            platforms,
            outboundCount: outbound,
            inboundCount: inbound,
            voiceNotes,
            summary,
        };
    });
    app.post('/reports/generate', { preHandler: [app.authenticate] }, async (req) => {
        const now = new Date();
        const reportDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const rows = await db.message.findMany({
            where: {
                userId: req.userId,
                timestamp: {
                    gte: reportDate,
                    lt: nextDay,
                },
            },
        });
        if (!rows.length)
            return { report: 'Tidak ada aktivitas hari ini.', messageCount: 0 };
        const logLines = rows.map((m) => {
            const dir = m.isOutgoing ? '→' : '←';
            const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '??:??';
            return `[${time}] ${dir} [${m.platform}] ${m.senderName ?? ''}: ${m.content ?? '(voice/file)'}`;
        });
        const chatLog = logLines.join('\n');
        let report = chatLog;
        try {
            report = await summarizeText(`Buat ringkasan aktivitas harian tim dari log chat berikut:\n\n${chatLog}`);
        }
        catch { /* use raw log */ }
        return { report, messageCount: rows.length };
    });
}
//# sourceMappingURL=index.js.map