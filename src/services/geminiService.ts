/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { BudgetAllocation, Liability, FinancialAccount, CSRCategory, PillarStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getFinancialAdvice(
  contextData: {
    income: number;
    savingsTarget: number;
    allocations: BudgetAllocation[];
    liabilities: Liability[];
    accounts: FinancialAccount[];
  },
  pillars: PillarStatus[],
  userMessage: string
) {
  const { income, savingsTarget, allocations, liabilities, accounts } = contextData;
  const csrBreakdown = allocations.reduce(
    (acc, a) => {
      acc[a.category] += a.amount;
      return acc;
    },
    { [CSRCategory.CONSTANT]: 0, [CSRCategory.SPENDING]: 0, [CSRCategory.RESERVE]: 0 } as Record<CSRCategory, number>
  );

  const totalMonthlyDebt = liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const totalEmergency = accounts.filter(a => a.isEmergencyFund).reduce((sum, f) => sum + f.amount, 0);

  const context = `
    User Financial Plan:
    - รายได้ต่อเดือน: ${income} บาท
    - การจัดสรรงบประมาณ (CSR):
      - คงที่ (Constant): ${csrBreakdown[CSRCategory.CONSTANT]} บาท (เป้าหมาย 50% = ${income * 0.5} บาท)
      - ใช้จ่าย (Spending): ${csrBreakdown[CSRCategory.SPENDING]} บาท (เป้าหมาย 30% = ${income * 0.3} บาท)
      - สำรอง (Reserve): ${csrBreakdown[CSRCategory.RESERVE]} บาท (เป้าหมาย 20% = ${income * 0.2} บาท)
    - ภาระหนี้สินสินเชื่อ:
      ${liabilities.map(l => `- ${l.name}: หนี้คงเหลือ ${l.totalAmount} บาท, ผ่อนเดือนละ ${l.monthlyPayment} บาท`).join('\n')}
      - ผ่อนหนี้รวมต่อเดือน: ${totalMonthlyDebt} บาท
    - เงินสำรองฉุกเฉิน (Emergency Fund):
      ${accounts.filter(a => a.isEmergencyFund).map(f => `- ${f.name}: ${f.amount} บาท (${f.purpose})`).join('\n')}
    - บัญชีเงินออม/ลงทุนอื่นๆ (Other Accounts):
      ${accounts.filter(a => !a.isEmergencyFund).map(f => `- ${f.name}: ${f.amount} บาท (${f.purpose})`).join('\n')}
      - ยอดเงินสำรองฉุกเฉิน: ${totalEmergency} บาท
      - ยอดทรัพย์สินรวมในบัญชีทั้งหมด: ${accounts.reduce((s, a) => s + a.amount, 0)} บาท
    - สถานะสุขภาพการเงิน 4 ด้าน:
      ${pillars.map(p => `- ${p.name}: ${p.status} (คะแนน: ${p.score}/100) - ${p.insight}`).join('\n')}
    
    เป้าหมายสูงสุด: บรรลุเงินออม ${savingsTarget.toLocaleString()} บาท
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `คุณคือสถาปนิกการเงิน AI ผู้เชี่ยวชาญ และที่ปรึกษาความมั่งคั่งส่วนบุคคล วิเคราะห์ข้อมูลนี้และตอบคำถามเป็นภาษาไทยอย่างมืออาชีพ: ${context}\n\nคำถามจากผู้ใช้: ${userMessage}` }]
        }
      ],
      config: {
        systemInstruction: "คุณคือ 'สถาปนิกการเงิน AI' ที่เน้นการเปลี่ยนข้อมูลให้เป็นการกระทำ (Actionable Insights) ตอบด้วยภาษาไทยที่สุภาพ เป็นมืออาชีพ กระชับ และตรงไปตรงมา เน้นการวิเคราะห์โครงสร้าง CSR และหลักการสุขภาพ 4-Pillar โดยมีจุดประสงค์หลักคือช่วยให้ผู้ใช้บรรลุเป้าหมาย 2,880,000 บาท ให้เร็วที่สุด หากพบความผิดปกติในกระแสเงินสด ให้เสนอวิธีแก้ไขที่ชัดเจนทันที",
      }
    });

    return response.text || "I am unable to provide advice at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an issue while analyzing your data.";
  }
}
