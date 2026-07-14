// Server-only face matching via Lovable AI Gateway (Gemini vision).
// Compares a selfie against event photos one-by-one for maximum accuracy.

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
- If these look like AI-generated or studio portraits using the same outfit/background template, treat that as a false-match risk and reject unless the face geometry is unmistakably the same.
- If the faces could be siblings, lookalikes, generated variants, or different people with the same beard/clothes/background, return {"match": false}. Only approve if rejecting the match would be clearly wrong.
- If Image A has no clear face, or Image B has no face, return no match.
- If there is any meaningful difference in nose, eyes, jaw/chin, lips, or eyebrow structure, return no match.
- If uncertain, return no match. Do NOT match just because both people share ethnicity, hairstyle, beard, or clothing style.

Confidence scale (0-100):
- 0-40: clearly different people
- 41-74: some superficial features similar but identity uncertain — no match
- 75-89: likely similar-looking, but not enough for this app — no match
- 90-100: unmistakably the same face/person

Return ONLY valid JSON: {"match": <boolean>, "confidence": <0-100>, "reason": "<one short sentence detailing why it matches or why it does not>"}.
Set "match": true ONLY when confidence >= ${MIN_MATCH_CONFIDENCE} AND you are unmistakably confident the facial geometry matches.`;

type SingleResult = { match: boolean; confidence: number; reason?: string };

async function compareOne(
  selfieUrl: string,
  photoUrl: string,
  apiKey: string,
): Promise<SingleResult> {
  const start = Date.now();
  const res = await askFaceVerifier(SYSTEM, selfieUrl, photoUrl, apiKey);
  console.log(`[FaceMatch Gemini] Verified photo in ${Date.now() - start}ms - Match: ${res.match}, Confidence: ${res.confidence}% (Reason: ${res.reason})`);
  return res;
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
          console.warn(`[Face++] Rate limited (status ${res.status}), retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Face++ API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.error_message) {
        if (data.error_message.includes("CONCURRENCY_LIMIT_EXCEEDED") || data.error_message.includes("RATE_LIMIT")) {
          console.warn(`[Face++] Concurrency limit exceeded, retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Face++ error: ${data.error_message}`);
      }

      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Face++] Request failed: ${err instanceof Error ? err.message : err}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function compareOneWithFacePP(
  selfieFaceToken: string | null,
  selfieUrl: string,
  photoUrl: string,
  apiKey: string,
  apiSecret: string,
  apiUrl: string,
): Promise<SingleResult> {
  const start = Date.now();
  try {
    if (selfieFaceToken) {
      const detectUrl = apiUrl.replace("/compare", "/detect");
      const detectParams = new URLSearchParams();
      detectParams.append("api_key", apiKey);
      detectParams.append("api_secret", apiSecret);
      detectParams.append("image_url", photoUrl);
      
      const detectData = await fetchFacePP(detectUrl, detectParams);
      const faces = detectData.faces || [];
      
      if (faces.length === 0) {
        console.log(`[FaceMatch Face++] No faces detected in photo in ${Date.now() - start}ms.`);
        return { match: false, confidence: 0, reason: "No faces detected in the event photo" };
      }

      console.log(`[FaceMatch Face++] Detected ${faces.length} faces in photo. Comparing each with selfie...`);

      let highestConfidence = 0;
      let isAnyMatch = false;
      let matchedReason = "";

      for (const face of faces) {
        const compareParams = new URLSearchParams();
        compareParams.append("api_key", apiKey);
        compareParams.append("api_secret", apiSecret);
        compareParams.append("face_token1", selfieFaceToken);
        compareParams.append("face_token2", face.face_token);

        const compareData = await fetchFacePP(apiUrl, compareParams);
        const confidence = Number(compareData.confidence) || 0;
        const strictThreshold = compareData.thresholds?.["1e-5"] || 75;
        const match = confidence >= strictThreshold;

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
        }

        if (match) {
          isAnyMatch = true;
          matchedReason = `Biometric match confirmed by Face++ (confidence: ${confidence}%, threshold: ${strictThreshold})`;
          break; // Found a match, skip rest
        }
      }

      console.log(`[FaceMatch Face++] Comparison done in ${Date.now() - start}ms. Best Confidence: ${highestConfidence}%, Match: ${isAnyMatch}`);
      return {
        match: isAnyMatch,
        confidence: highestConfidence,
        reason: isAnyMatch ? matchedReason : "No matching biometric face found in the photo",
      };
    }

    // Fallback: Default URL-based comparison
    console.log(`[FaceMatch Face++] Falling back to default URL-based comparison...`);
    const params = new URLSearchParams();
    params.append("api_key", apiKey);
    params.append("api_secret", apiSecret);
    params.append("image_url1", selfieUrl);
    params.append("image_url2", photoUrl);

    const compareData = await fetchFacePP(apiUrl, params);
    const confidence = Number(compareData.confidence) || 0;
    const strictThreshold = compareData.thresholds?.["1e-5"] || 75;
    const match = confidence >= strictThreshold;

    console.log(`[FaceMatch Face++] Default comparison done in ${Date.now() - start}ms - Match: ${match}, Confidence: ${confidence}%`);
    return {
      match,
      confidence,
      reason: match ? "Biometric match confirmed by Face++ (default)" : "No biometric match found",
    };
  } catch (err) {
    console.error(`[FaceMatch Face++] Failed for photo:`, err);
    return { match: false, confidence: 0, reason: err instanceof Error ? err.message : String(err) };
  }
}

async function askFaceVerifier(
  systemPrompt: string,
  selfieUrl: string,
  photoUrl: string,
  apiKey: string,
): Promise<SingleResult> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
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
    return { match, confidence, reason: parsed.reason };
  } catch {
    return { match: false, confidence: 0 };
  }
}

export async function matchSelfieAgainstPhotos(
  selfieUrl: string,
  photos: Array<{ id: string; photo_url: string }>,
): Promise<Array<{ photo_id: string; confidence: number }>> {
  const faceppKey = process.env.FACEPP_API_KEY;
  const faceppSecret = process.env.FACEPP_API_SECRET;
  const faceppUrl = process.env.FACEPP_API_URL || "https://api-us.faceplusplus.com/facepp/v3/compare";

  const lovableApiKey = process.env.LOVABLE_API_KEY;

  const isFacePP = !!(faceppKey && faceppSecret);

  if (!isFacePP && !lovableApiKey) {
    throw new Error("Neither FACEPP_API_KEY/FACEPP_API_SECRET nor LOVABLE_API_KEY is configured");
  }

  if (photos.length === 0) return [];

  const results: Array<{ photo_id: string; confidence: number }> = [];
  const CONCURRENCY = isFacePP ? 3 : 8;
  const totalStart = Date.now();
  console.log(`[FaceMatch] Starting face match search using ${isFacePP ? "Face++ (Multi-Face)" : "Gemini 2.5 Flash"} for ${photos.length} photos with concurrency limit of ${CONCURRENCY}...`);

  let selfieFaceToken: string | null = null;
  if (isFacePP) {
    try {
      console.log("[FaceMatch] Detecting face in selfie...");
      const detectUrl = faceppUrl.replace("/compare", "/detect");
      const detectParams = new URLSearchParams();
      detectParams.append("api_key", faceppKey!);
      detectParams.append("api_secret", faceppSecret!);
      detectParams.append("image_url", selfieUrl);
      
      const detectData = await fetchFacePP(detectUrl, detectParams);
      if (detectData.faces && detectData.faces.length > 0) {
        const sortedFaces = detectData.faces.sort((a: any, b: any) => {
          const areaA = a.face_rectangle.width * a.face_rectangle.height;
          const areaB = b.face_rectangle.width * b.face_rectangle.height;
          return areaB - areaA;
        });
        selfieFaceToken = sortedFaces[0].face_token;
        console.log(`[FaceMatch] Selfie face token obtained: ${selfieFaceToken}`);
      } else {
        console.warn("[FaceMatch] No faces detected in selfie. URL fallback will be used.");
      }
    } catch (err) {
      console.error("[FaceMatch] Failed to detect face in selfie:", err);
    }
  }

  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const chunk = photos.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map((p) => {
        if (isFacePP) {
          return compareOneWithFacePP(selfieFaceToken, selfieUrl, p.photo_url, faceppKey!, faceppSecret!, faceppUrl);
        } else {
          return compareOne(selfieUrl, p.photo_url, lovableApiKey!);
        }
      }),
    );
    settled.forEach((s, idx) => {
      const photo = chunk[idx];
      if (s.status === "fulfilled" && s.value.match) {
        results.push({ photo_id: photo.id, confidence: s.value.confidence });
      } else if (s.status === "rejected") {
        console.error("Face compare failed for", photo.id, s.reason);
      }
    });
  }
  console.log(`[FaceMatch] Finished face match search. Found ${results.length} matches in ${Date.now() - totalStart}ms.`);
  return results;
}

