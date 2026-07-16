// Dual-engine face matching: Face++ (fast) + AWS Rekognition (accurate).
// Strategy: Run both engines in parallel. Accept if EITHER engine confirms a match.
// Face++ catches close-up frontal matches fast. AWS catches group/distant/angled photos.

import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";

// ── Gemini fallback (when no Face++/AWS credentials) ────────────────────────
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MIN_MATCH_CONFIDENCE = 90;

const SYSTEM = `You are a strict biometric face-verification system. You will receive exactly two images:
- Image A: a reference selfie of ONE specific person.
- Image B: an event photo that may or may not contain that same person.

Your task: decide if the SAME individual from Image A appears anywhere in Image B.

Rules — be extremely conservative and strict. Your main job is to catch false positives. Err on the side of NO MATCH to ensure exact face matching:
- Compare ONLY the facial identity. Completely ignore clothing, suits, ties, backgrounds, poses, lighting, camera distance, image quality, and generated/studio portrait style.
- Match ONLY when immutable facial geometry aligns perfectly: eye shape/spacing, eyelids, nose bridge & tip, nostril shape, jawline, chin, cheekbones, ear shape, forehead, brow ridge, mouth/lip shape, and facial proportions.
- Skin tone, gender, beard/hair style, glasses, same clothing, or similar backgrounds are NOT sufficient. Two different bearded men in the same suit or template are still different people.
- If the faces could be siblings, lookalikes, generated variants, or different people with the same beard/clothes/background, return {"match": false}. Only approve if rejecting the match would be clearly wrong.
- If Image A has no clear face, or Image B has no face, return no match.
- If there is any meaningful difference in nose, eyes, jaw/chin, lips, or eyebrow structure, return no match.
- If uncertain, return no match.

Confidence scale (0-100):
- 0-40: clearly different people
- 41-74: some superficial features similar but identity uncertain — no match
- 75-89: likely similar-looking, but not enough for this app — no match
- 90-100: unmistakably the same face/person

Return ONLY valid JSON: {"match": <boolean>, "confidence": <0-100>, "reason": "<one short sentence>"}.
Set "match": true ONLY when confidence >= ${MIN_MATCH_CONFIDENCE} AND you are unmistakably confident the facial geometry matches.`;

// ── Types ────────────────────────────────────────────────────────────────────
type SingleResult = { match: boolean; confidence: number; reason?: string; engine?: string };

type SelfieInfo = {
  faceToken: string;
  quality: number;
  yaw: number;
  roll: number;
  gender?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function downloadImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchFacePP(url: string, params: URLSearchParams, retries = 3, delay = 1000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 403 || res.status === 429) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Face++ API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.error_message) {
        if (data.error_message.includes("CONCURRENCY_LIMIT_EXCEEDED") || data.error_message.includes("RATE_LIMIT")) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Face++ error: ${data.error_message}`);
      }
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// ── Engine 1: AWS Rekognition ─────────────────────────────────────────────────
// More accurate than Face++ for group photos, distant faces, and side angles.
// Threshold: 80% similarity = confirmed match.
const AWS_SIMILARITY_THRESHOLD = 80;

let _rekognitionClient: RekognitionClient | null = null;
function getRekognitionClient(): RekognitionClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  if (!_rekognitionClient) {
    _rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _rekognitionClient;
}

async function compareWithAWS(
  selfieUrl: string,
  photoUrl: string,
): Promise<SingleResult> {
  const client = getRekognitionClient();
  if (!client) return { match: false, confidence: 0, reason: "AWS not configured", engine: "aws" };

  const start = Date.now();
  try {
    // Download both images in parallel
    const [selfieBytes, photoBytes] = await Promise.all([
      downloadImageBuffer(selfieUrl),
      downloadImageBuffer(photoUrl),
    ]);

    const command = new CompareFacesCommand({
      SourceImage: { Bytes: selfieBytes },
      TargetImage: { Bytes: photoBytes },
      SimilarityThreshold: 0, // Get all candidates; we filter manually
      QualityFilter: "MEDIUM",
    });

    const response = await client.send(command);
    const matches = response.FaceMatches || [];

    if (matches.length === 0) {
      console.log(`[FaceMatch AWS] No match in ${Date.now() - start}ms (unmatched faces: ${response.UnmatchedFaces?.length ?? 0})`);
      return { match: false, confidence: 0, reason: "No face match found by AWS Rekognition", engine: "aws" };
    }

    // Best match by similarity
    const best = matches.sort((a, b) => (b.Similarity ?? 0) - (a.Similarity ?? 0))[0];
    const similarity = Number(best.Similarity?.toFixed(1)) || 0;
    const isMatch = similarity >= AWS_SIMILARITY_THRESHOLD;

    console.log(`[FaceMatch AWS] Done in ${Date.now() - start}ms — similarity=${similarity}% match=${isMatch}`);
    return {
      match: isMatch,
      confidence: similarity,
      reason: isMatch
        ? `AWS Rekognition confirmed (similarity: ${similarity}%, threshold: ${AWS_SIMILARITY_THRESHOLD}%)`
        : `AWS Rekognition below threshold (similarity: ${similarity}%, need ${AWS_SIMILARITY_THRESHOLD}%)`,
      engine: "aws",
    };
  } catch (err) {
    console.error(`[FaceMatch AWS] Error:`, err);
    return { match: false, confidence: 0, reason: err instanceof Error ? err.message : String(err), engine: "aws" };
  }
}

// ── Engine 2: Face++ ─────────────────────────────────────────────────────────
// Faster than AWS. Used as wide-net first pass.
// Lower threshold (68%) to catch as many real matches as possible.
// AWS acts as verifier for anything Face++ finds.
const FACEPP_WIDE_THRESHOLD = 68;

async function detectSelfieWithFacePP(
  selfieUrl: string,
  apiKey: string,
  apiSecret: string,
  detectUrl: string,
): Promise<SelfieInfo | null> {
  const params = new URLSearchParams();
  params.append("api_key", apiKey);
  params.append("api_secret", apiSecret);
  params.append("image_url", selfieUrl);
  params.append("return_attributes", "gender,headpose,facequality");

  const data = await fetchFacePP(detectUrl, params);
  const faces = data.faces || [];
  if (faces.length === 0) return null;

  const face = faces.sort((a: any, b: any) =>
    b.face_rectangle.width * b.face_rectangle.height - a.face_rectangle.width * a.face_rectangle.height
  )[0];

  const attrs = face.attributes || {};
  const headpose = attrs.headpose || {};
  return {
    faceToken: face.face_token,
    quality: attrs.facequality?.value ?? 80,
    yaw: Math.abs(headpose.yaw_angle ?? 0),
    roll: Math.abs(headpose.roll_angle ?? 0),
    gender: attrs.gender?.value,
  };
}

async function compareWithFacePP(
  selfieInfo: SelfieInfo | null,
  selfieUrl: string,
  photoUrl: string,
  apiKey: string,
  apiSecret: string,
  apiUrl: string,
): Promise<SingleResult> {
  const start = Date.now();
  try {
    if (selfieInfo?.faceToken) {
      const detectUrl = apiUrl.replace("/compare", "/detect");

      // Detect faces in event photo
      const detectParams = new URLSearchParams();
      detectParams.append("api_key", apiKey);
      detectParams.append("api_secret", apiSecret);
      detectParams.append("image_url", photoUrl);
      detectParams.append("return_attributes", "gender,headpose,facequality");

      let detectData = await fetchFacePP(detectUrl, detectParams);
      let faces = detectData.faces || [];

      // Retry with landmark model if no faces found
      if (faces.length === 0) {
        const retryParams = new URLSearchParams();
        retryParams.append("api_key", apiKey);
        retryParams.append("api_secret", apiSecret);
        retryParams.append("image_url", photoUrl);
        retryParams.append("return_landmark", "2");
        retryParams.append("return_attributes", "gender,headpose,facequality");
        try {
          detectData = await fetchFacePP(detectUrl, retryParams);
          faces = detectData.faces || [];
        } catch { /* silent */ }
      }

      if (faces.length === 0) {
        return { match: false, confidence: 0, reason: "No faces detected in the event photo", engine: "facepp" };
      }

      let highestConfidence = 0;
      let isAnyMatch = false;
      let matchedReason = "";

      for (const face of faces) {
        const attrs = face.attributes || {};
        const faceQuality = attrs.facequality?.value ?? 50;

        // Skip extremely blurry/tiny faces
        if (faceQuality < 10) continue;

        // Quick gender pre-filter (skip obvious mismatches)
        const eventGender = attrs.gender?.value;
        if (selfieInfo.gender && eventGender && selfieInfo.gender !== eventGender) continue;

        const compareParams = new URLSearchParams();
        compareParams.append("api_key", apiKey);
        compareParams.append("api_secret", apiSecret);
        compareParams.append("face_token1", selfieInfo.faceToken);
        compareParams.append("face_token2", face.face_token);

        const compareData = await fetchFacePP(apiUrl, compareParams);
        const confidence = Number(compareData.confidence) || 0;

        if (confidence > highestConfidence) highestConfidence = confidence;

        if (confidence >= FACEPP_WIDE_THRESHOLD) {
          isAnyMatch = true;
          matchedReason = `Face++ wide-net match (confidence: ${confidence.toFixed(1)}%, threshold: ${FACEPP_WIDE_THRESHOLD}%)`;
          break;
        }
      }

      console.log(`[FaceMatch Face++] Done in ${Date.now() - start}ms. Best: ${highestConfidence.toFixed(1)}%, Match: ${isAnyMatch}`);
      return {
        match: isAnyMatch,
        confidence: highestConfidence,
        reason: isAnyMatch ? matchedReason : `No match (best: ${highestConfidence.toFixed(1)}%)`,
        engine: "facepp",
      };
    }

    // Fallback: URL-based
    const params = new URLSearchParams();
    params.append("api_key", apiKey);
    params.append("api_secret", apiSecret);
    params.append("image_url1", selfieUrl);
    params.append("image_url2", photoUrl);

    const compareData = await fetchFacePP(apiUrl, params);
    const confidence = Number(compareData.confidence) || 0;
    const match = confidence >= FACEPP_WIDE_THRESHOLD;

    return {
      match,
      confidence,
      reason: match ? `Face++ match (confidence: ${confidence.toFixed(1)}%)` : "No match",
      engine: "facepp",
    };
  } catch (err) {
    console.error(`[FaceMatch Face++] Error:`, err);
    return { match: false, confidence: 0, reason: String(err), engine: "facepp" };
  }
}

// ── Gemini fallback ──────────────────────────────────────────────────────────
async function compareWithGemini(selfieUrl: string, photoUrl: string, apiKey: string): Promise<SingleResult> {
  const start = Date.now();
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Image A (reference selfie):" },
            { type: "image_url", image_url: { url: selfieUrl } },
            { type: "text", text: "Image B (event photo to check):" },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    throw new Error(`AI gateway error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const jsonText = typeof raw === "string" ? (raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) : "{}";
  try {
    const parsed = JSON.parse(jsonText) as SingleResult;
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    const match = Boolean(parsed.match) && confidence >= MIN_MATCH_CONFIDENCE;
    console.log(`[FaceMatch Gemini] Done in ${Date.now() - start}ms — match=${match}, confidence=${confidence}%`);
    return { match, confidence, reason: parsed.reason, engine: "gemini" };
  } catch {
    return { match: false, confidence: 0, engine: "gemini" };
  }
}

// ── Dual-engine comparison ───────────────────────────────────────────────────
// Run Face++ and AWS in parallel. Accept if EITHER confirms a match.
// This maximizes recall (no real photo missed) while AWS prevents false positives.
async function compareDualEngine(
  selfieInfo: SelfieInfo | null,
  selfieUrl: string,
  photoUrl: string,
  faceppKey: string,
  faceppSecret: string,
  faceppUrl: string,
  hasAWS: boolean,
): Promise<SingleResult> {
  if (hasAWS) {
    // Run both engines simultaneously
    const [faceppResult, awsResult] = await Promise.all([
      compareWithFacePP(selfieInfo, selfieUrl, photoUrl, faceppKey, faceppSecret, faceppUrl),
      compareWithAWS(selfieUrl, photoUrl),
    ]);

    // Accept if Face++ is very confident (>=82%) — clearly same person, no need for AWS
    if (faceppResult.confidence >= 82) {
      return { ...faceppResult, reason: `[Face++] ${faceppResult.reason}` };
    }

    // Accept if AWS is confident (>=80%) — catches group/distant/angled photos
    if (awsResult.match) {
      return { ...awsResult, reason: `[AWS] ${awsResult.reason}` };
    }

    // Accept if Face++ wide-net matched (68-81%) — face was detected as likely match
    if (faceppResult.match) {
      return { ...faceppResult, reason: `[Face++] ${faceppResult.reason}` };
    }

    // Neither matched — use whichever had higher confidence for reporting
    const best = faceppResult.confidence >= awsResult.confidence ? faceppResult : awsResult;
    return { match: false, confidence: best.confidence, reason: "No match from either engine" };
  }

  // AWS not configured — Face++ only with moderate threshold
  const faceppResult = await compareWithFacePP(selfieInfo, selfieUrl, photoUrl, faceppKey, faceppSecret, faceppUrl);
  // Without AWS verification, use stricter threshold to avoid false positives
  if (faceppResult.confidence < 80) {
    return { match: false, confidence: faceppResult.confidence, reason: faceppResult.reason };
  }
  return faceppResult;
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function matchSelfieAgainstPhotos(
  selfieUrl: string,
  photos: Array<{ id: string; photo_url: string }>,
): Promise<Array<{ photo_id: string; confidence: number }>> {
  const faceppKey = process.env.FACEPP_API_KEY;
  const faceppSecret = process.env.FACEPP_API_SECRET;
  const faceppUrl = process.env.FACEPP_API_URL || "https://api-us.faceplusplus.com/facepp/v3/compare";
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const hasAWS = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const isFacePP = !!(faceppKey && faceppSecret);

  if (!isFacePP && !lovableApiKey) {
    throw new Error("Neither FACEPP_API_KEY/FACEPP_API_SECRET nor LOVABLE_API_KEY is configured");
  }

  if (photos.length === 0) return [];

  const results: Array<{ photo_id: string; confidence: number }> = [];
  const CONCURRENCY = 5;
  const totalStart = Date.now();
  const engines = isFacePP ? (hasAWS ? "Face++ + AWS Rekognition" : "Face++ only") : "Gemini";
  console.log(`[FaceMatch] Starting ${engines} dual-engine search across ${photos.length} photos...`);

  // Detect selfie attributes once (reused for all comparisons)
  let selfieInfo: SelfieInfo | null = null;
  if (isFacePP) {
    try {
      const detectUrl = faceppUrl.replace("/compare", "/detect");
      selfieInfo = await detectSelfieWithFacePP(selfieUrl, faceppKey!, faceppSecret!, detectUrl);
      if (selfieInfo) {
        console.log(`[FaceMatch] Selfie — quality=${selfieInfo.quality.toFixed(1)}/100, yaw=${selfieInfo.yaw.toFixed(1)}°, gender=${selfieInfo.gender ?? "unknown"}`);
      } else {
        console.warn("[FaceMatch] No face in selfie — URL fallback will be used.");
      }
    } catch (err) {
      console.error("[FaceMatch] Selfie detection failed:", err);
    }
  }

  // Process photos in parallel batches
  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const chunk = photos.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map((p) => {
        if (isFacePP) {
          return compareDualEngine(selfieInfo, selfieUrl, p.photo_url, faceppKey!, faceppSecret!, faceppUrl, hasAWS);
        } else {
          return compareWithGemini(selfieUrl, p.photo_url, lovableApiKey!);
        }
      }),
    );
    settled.forEach((s, idx) => {
      const photo = chunk[idx];
      if (s.status === "fulfilled" && s.value.match) {
        console.log(`[FaceMatch] ✅ MATCH: photo=${photo.id} confidence=${s.value.confidence.toFixed(1)}% engine=${s.value.engine} reason="${s.value.reason}"`);
        results.push({ photo_id: photo.id, confidence: s.value.confidence });
      } else if (s.status === "rejected") {
        console.error(`[FaceMatch] ❌ Error for photo ${photo.id}:`, s.reason);
      }
    });
  }

  console.log(`[FaceMatch] Done. Found ${results.length}/${photos.length} matches in ${Date.now() - totalStart}ms.`);
  return results;
}


