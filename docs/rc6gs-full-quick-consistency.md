# RC6GS V3 Full / Quick publication review

Publication copies: `/manuals/rc6gs-v3/` and `/manuals/rc6gs-v3-quick-reference/`. Knowledge remains **NOT_VALIDATED**. This review does not promote claims to VERIFIED or Agent-ready. RC4GS generation-unspecified remains withheld. All six historically unsafe downloads remain withheld; publishing corrected HTML does not approve their original bytes.

## Authoritative evidence

Physical page numbers below are evidence locators, not public chapters.

| Key | Official English source                                                                 | SHA-256                                                            | Applicability                                                      |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| E   | [RC6GS V3 full](https://radiolink.com.cn/download/3edba11a28636d2f5f2f6002d04a92aa.pdf) | `377476a9bec1ed9717187bf08fcd67953b0e81d72ae51331eff1cc6e2f717e08` | Identity checked, 16 pages; current separate CH6/CH7 configuration |
| R   | [Current R7FG](https://radiolink.com/download/9d6ed179836fac0b70b22358ed028fc1-3271)    | `328fb7839ba298754ed1a1880e59495f18ec8145a7cac69d56b7749415423ada` | 9 pages; source diagram revision V1.4                              |
| L   | [Earlier R7FG](https://radiolink.com/download/de7bdc850577376ee16891eff5cb657a-3272)    | `51e9f7ebb3dc1504d8d931131c99207d58bbb2f384616341f97496c5a2a03104` | 9 pages; 4.6–10V, shared CH7 serial output                         |

Japanese Full source: `pdf/RC6GS RCプロポセット取扱説明書（V3対応）.pdf`, SHA-256 `bba004c2b9e7d6cfee5a100f749727a01e281da57ed093dee72d9ed12c2c2961`, 46 pages. The p9 original diagram depicts revision V1.2. Its image is unchanged. Source blocks, rectangles, physical pages, original extraction hashes and figure source hashes are retained in `existing-ja.json`. Quick retains its DOCX source identity, V1.4 evidence provenance and previous nine correction records, including the previous reviewed binding wording.

The previously stored English file named `rc6gsv3_manual.pdf` was an RC4GS manual. It is not evidence for this release. Receiver type equality does **not** establish equal voltage limits or output wiring: actual manufacturer sources confirm differences. Public instructions use body rating and confirmed terminal specifications, not revision shorthand. If those cannot be established, do not power or apply the output-mode table.

## Consistency matrix

Shared operating guidance is rendered by one component in both independent documents. A missing detailed topic is not treated as a contradiction or silently invented.

| Topic                          | Full Manual                                            | Quick Reference                           | English Canonical Source   | Result               | Action                                                       |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------------- | -------------------------- | -------------------- | ------------------------------------------------------------ |
| Receiver name                  | R7FG                                                   | R7FG                                      | E7, R4, L7–8               | MATCH                | Revision retained only in provenance/original images         |
| Receiver ports                 | Body rating + confirmed output layout                  | Same conditional guide                    | E7, R4/7, L7–8             | MATCH                | Do not identify layout by LED alone                          |
| Operating voltage              | 4.6–10V or 3–12V by body rating                        | Same                                      | E7, L8                     | MATCH                | Unknown rating: do not power                                 |
| Power connection               | Ordinary receiver power; no telemetry power            | Same                                      | E8, R7                     | MATCH                | Ban telemetry-port power                                     |
| Power-on sequence              | TX then RX                                             | Same                                      | E7 binding; R4             | MATCH                | Secure model and stationary RX                               |
| Transmitter/receiver startup   | TX then RX                                             | Same                                      | E7, R4                     | MATCH                | Do not apply binding repower as startup                      |
| Binding                        | About 50cm; hold >1s, release                          | Same                                      | E7 §1.2.3, R4              | MATCH                | Align source wording and preserve prior record               |
| Binding completion             | Fast blink → steady; signal tower; operation check     | Same                                      | E7, R4                     | MATCH                | Do not equate a generic long press with normal activation    |
| LED indication                 | Conditional mode table                                 | Same                                      | E7, R7, L7                 | MATCH                | Orange/green-red earlier layout; red current PWM gyro        |
| Telemetry function             | Signal/voltage monitoring                              | Receiver/function overview                | E7–9, R7                   | EDITORIAL_DIFFERENCE | Same purpose; Full has detail                                |
| Telemetry measured voltage     | 2S–8S, 7.4–33.6V                                       | No detailed range                         | E8 §1.2.7                  | NOT_PRESENT_IN_QUICK | Do not confuse monitored battery with RX power               |
| RSSI                           | Dedicated RSSI screen and alarm section                | Overview, no complete procedure           | E8–9 §1.2.8                | EDITORIAL_DIFFERENCE | No conflicting operation published                           |
| Output modes                   | Device-conditioned four modes                          | Same                                      | E7, R7, L7                 | MATCH                | Scope later tables explicitly                                |
| PWM                            | Earlier CH1–6; current CH1–7 in PWM-only mode          | Same                                      | E7, L7                     | MATCH                | Do not flatten different layouts                             |
| PPM                            | Earlier CH7; current CH6                               | Same                                      | E7, L7                     | MATCH                | Device-conditioned mapping                                   |
| SBUS                           | CH7                                                    | Same                                      | E7, L7                     | MATCH                | Current CH6 is not SBUS                                      |
| Channel mapping                | CH1 steering / CH2 throttle; conditioned outputs       | Same                                      | E7, R7, L7                 | MATCH                | Original earlier diagram retained with scoped caption        |
| Gyro enable/disable            | Three short presses within 1s                          | Same                                      | E8, R8, L8                 | MATCH                | Two presses are not ON/OFF                                   |
| Gyro phase switching           | Two short presses within 1s; recheck wheels            | Same                                      | E8, R8, L8                 | MATCH                | Functional verification, not universal blink count           |
| Phase confirmation blink count | Not asserted as universal                              | Not asserted as universal                 | E8/L8: two; R8: one        | NOT_ESTABLISHED      | Actual compensating wheel direction is the safe confirmation |
| Gyro forward/reverse           | Fixed model, rotate left/right, inverse correction     | Same                                      | E8, R8, L8                 | MATCH                | Remove unsupported one-press forward command                 |
| Gyro sensitivity               | VR + GYRO configuration detail                         | No complete adjustment procedure          | E14 §2.20, R8              | NOT_PRESENT_IN_QUICK | No invented Quick procedure                                  |
| Failsafe                       | Signal loss; per-channel output                        | Same operating safety guidance            | E14 §2.21                  | MATCH                | Low-voltage alarm is not the trigger                         |
| Safety warnings                | Full warnings plus shared power/gyro/model precautions | Same shared critical precautions          | E2/7–8, R4/8               | EDITORIAL_DIFFERENCE | Full retains additional warnings                             |
| Shutdown                       | RX then TX                                             | Same                                      | E2 safety                  | MATCH                | Never ordinary RX-on with TX-off                             |
| Binding repower confirmation   | Not separately detailed                                | TX off/on after binding, fixed model only | R9 antenna final paragraph | NOT_PRESENT_IN_FULL  | Clearly distinguished from normal startup                    |
| Four short presses             | Quick consecutive presses, current-layout only         | Same                                      | R7 signal-switch table     | MATCH                | Do not apply to shared CH7 layout                            |

FULL_QUICK_TECHNICAL_CONTRADICTIONS: 0

## Reviewed corrections

Exact before/after HTML, source page, reason and official English hash/page are machine-recorded in `technical_changes`; the original extracted text is retained. The gate replays corrections against the original snapshot and rejects any additional edit, even if its publication hash is recalculated.

- JA9: unqualified 3–12V table → actual body-rating conditions (L8/E7).
- JA10: gyro-setting stillness → power-on self-check stillness (R4); current-layout LED and mode applicability (E7/L7–8); binding distance/time → about50cm/>1s (E7).
- JA11: telemetry power permission → prohibition (E8/R7); both two-press ON/OFF cells → phase switching (E8); four presses → quick short presses (R7); unsupported one-press forward instruction → fixed-model compensating wheel check (E8).
- JA11–12: phase confirmation → two short presses and actual wheel-direction recheck, without a universal blink count (E8/R8/L8).
- JA12: generic long-press activation → binding/release/fast-green/steady/operation verification (E7); unsafe RX-on with TX-off → normal TX-first startup / RX-first shutdown (E2/7).
- JA13: nominal29.6V treated as maximum → manufacturer telemetry range7.4–33.6V (E8).
- JA30: copied numeric SUBTR/0% instructions under REVERSE → selected channel NOR/REV and actual direction check; original screenshot preserved (E12 §2.13).
- JA32: copied D/R/ST/Throttle procedure under ATL → ATL brake RATE0–100%, initial100%; no unsupported button sequence invented (E13 §2.15).
- JA40: low-voltage-triggered F/S → signal-loss output setting, CH1–7 (E14 §2.21).
- Quick: nine prior corrections remain; binding wording aligned with E7, with previous reviewed wording preserved; Full-publication notice updated; output-layout scope and fixed-model repower caution added.

Additional source-backed chapter2 corrections found during independent review:

| Japanese source physical page | Correction                                                                                                                                              | Official English evidence                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 17                            | EPA includes CH7; EPA menu typo                                                                                                                         | E9 §2.4                                                        |
| 18                            | STEXP initial0%, correct STEXP menu; do not assert unsupported100% reset shortcut                                                                       | E10 §2.5                                                       |
| 24–25                         | DLY100 approximate delay1.7s, not1.4s                                                                                                                   | E11 §2.9                                                       |
| 26                            | STM procedure selects STM, not brake-return ABP                                                                                                         | E11 §2.9                                                       |
| 27                            | BRAK100 is maximum brake-side output, not the FWRD half-travel condition                                                                                | E12 §2.10                                                      |
| 28                            | TH-LOCK fixes output to configured−100..+100 regardless of trigger; it is not a motor-stop safety inhibit                                               | E12 §2.11.2                                                    |
| 29                            | SUBTR covers CH1–7                                                                                                                                      | E12 §2.12                                                      |
| 36                            | Steering reversal selects ST, not TH; original figure042 preserved                                                                                      | E12 §2.13 + original ST:REV diagram                            |
| 37                            | PMIX2 masterST/slaveTH; original figure045 preserved                                                                                                    | E13 §2.16 MST/SLV definitions + original MST:ST/SLV:TH diagram |
| 38                            | AUX CH3–7; RATE/temperature alarms are unavailable, not merely shared settings                                                                          | E13 §2.17/2.19                                                 |
| 39                            | GYRO instructions explicitly conditional on displayed MIX/STD/VR; INH disables, ON enables, STD0–100; different original menu figure retained unchanged | E14 §2.20                                                      |
| 41                            | ID SEED selects one receiver, others standby; not a redundancy system or F/S-menu operation                                                             | E14 §2.22                                                      |
| 46                            | RESET permanently erases current model memory, not all transmitter models                                                                               | E16 §2.25                                                      |

## Publication and remaining limits

Two independent routes and mutual links; 46 Full source segments, 62 original figure crops, three tables. Source page is evidence only. Semantic hierarchy uses actual chapters/sections; numbered procedure paragraphs that are not section headings are not TOC entries. Old unsafe PDF/DOCX downloads are not restored. No other product or RC4GS safety decision changes.

Open item: phase blink-count difference remains an evidence limitation, not an actionable universal instruction. Real-hardware confirmation has not been performed. This release is corrected publication HTML, not manufacturer endorsement or Knowledge validation. Production deploy/merge requires owner action.

DSC additionally distinguishes the original two-mode illustration from the three modes supported by firmware V6.7.7 or later (E15 §2.23). The original illustration is retained.
