/* global BigInt */
import { Buffer } from "buffer";
import base64 from "base-64";
import { HEADERS, makeJsonData, QTRY_CONTRACT_INDEX } from "./commons";
import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";
import { externalJsonAssetUrl, debuglog } from "./commons";
import { hashBetData } from "./hashUtils";
import { getBetDescription, setBetDescription } from "./betDescriptionCache";

// Get Node's info using qubic-http's API
export const fetchNodeInfo = async (httpEndpoint, backendUrl) => {
  try {
    const jsonData = makeJsonData(QTRY_CONTRACT_INDEX, 1, 0, "");
    const query_smart_contract_api_uri = `${httpEndpoint}/v1/querySmartContract`;

    const response = await fetch(query_smart_contract_api_uri, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(jsonData),
    });

    // Check if the response is not ok (status is not 200-299)
    if (!response.ok) {
      throw new Error(
        `Error fetching node info: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    const data = base64.decode(responseData.responseData);
    const buffer = Buffer.from(data, "binary");

    // Unpacking data using DataView
    const dataView = new DataView(buffer.buffer);

    const feePerSlotPerHour = dataView.getBigUint64(0, true);
    const gameOperatorFee = dataView.getBigUint64(8, true);
    const shareholderFee = dataView.getBigUint64(16, true);
    const minBetSlotAmount = dataView.getBigUint64(24, true);
    const burnFee = dataView.getBigUint64(32, true);
    const nIssuedBet = dataView.getUint32(40, true);
    // Skipping 4 bytes due to padding, so the next byte offset must be 48
    const moneyFlow = dataView.getBigUint64(48, true);
    const moneyFlowThroughIssueBet = dataView.getBigUint64(56, true);
    const moneyFlowThroughJoinBet = dataView.getBigUint64(64, true);
    const moneyFlowThroughFinalizeBet = dataView.getBigUint64(72, true);
    const earnedAmountForShareholder = dataView.getBigUint64(80, true);
    const paidAmountForShareholder = dataView.getBigUint64(88, true);
    const earnedAmountForBetWinner = dataView.getBigUint64(96, true);
    const distributedAmount = dataView.getBigUint64(104, true);
    const burnedAmount = dataView.getBigUint64(112, true);

    // This is Game operator public key, which is 32 bytes, converting it to Uint8Array
    // for later qubicHelper.getidentity() decoding.
    const gameOperatorBytes = new Uint8Array(buffer.slice(120, 152)); // 32 bytes

    // Returning the unpacked data
    return {
      fee_per_slot_per_hour: Number(feePerSlotPerHour),
      game_operator_fee: Number(gameOperatorFee),
      shareholder_fee: Number(shareholderFee),
      min_bet_slot_amount: Number(minBetSlotAmount),
      burn_fee: Number(burnFee),
      n_issued_bet: nIssuedBet,
      money_flow: Number(moneyFlow),
      money_flow_through_issue_bet: Number(moneyFlowThroughIssueBet),
      money_flow_through_join_bet: Number(moneyFlowThroughJoinBet),
      money_flow_through_finalize_bet: Number(moneyFlowThroughFinalizeBet),
      earned_amount_for_shareholder: Number(earnedAmountForShareholder),
      paid_amount_for_shareholder: Number(paidAmountForShareholder),
      earned_amount_for_bet_winner: Number(earnedAmountForBetWinner),
      distributed_amount: Number(distributedAmount),
      burned_amount: Number(burnedAmount),
      game_operator: gameOperatorBytes,
    };
  } catch (error) {
    console.error("Error in fetchNodeInfo:", error.message);
    console.log("Falling back to old API for node info.");

    // Fallback to old API
    try {
      const response = await fetch(`${backendUrl}/get_all_bets`);
      const data = await response.json();

      if (data.node_info) {
        return data.node_info[0];
      } else {
        throw new Error("Node info not found in old API response");
      }
    } catch (fallbackError) {
      console.error(
        "Error fetching node info from old API:",
        fallbackError.message
      );
      throw fallbackError; // Re-throwing the error for handling later in the caller
    }
  }
};

// Fetch bets considered "active" by Quottery core (not reached end dates)
// In the frontend/UI, "active" bets haven't reached close dates,
// "locked" bets haven't reached end dates, and "inactive" bets have exceeded end dates.
// This function retrieves Quottery core active bet IDs using the qubic-http API.
export const fetchActiveBets = async (httpEndpoint) => {
  const json_data = makeJsonData(QTRY_CONTRACT_INDEX, 4, 0, "");
  const query_smart_contract_api_uri = `${httpEndpoint}/v1/querySmartContract`;

  const response = await fetch(query_smart_contract_api_uri, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(json_data),
  });

  const responseData = await response.json();
  const data = base64.decode(responseData.responseData);

  // Use Buffer to handle binary data
  const buffer = Buffer.from(data, "binary");

  // Read the count of active bets (first 4 bytes as UInt32)
  const count = buffer.readUInt32LE(0);

  // Extract active bet IDs from the rest of the buffer
  const activeBetIds = [];
  for (let i = 0; i < count; i++) {
    activeBetIds.push(buffer.readUInt32LE(4 + i * 4));
  }

  return activeBetIds;
};

const parseFixedSizeStrings = (buffer, start, length, count, itemSize) => {
  // const items_ = [length];
  const items = [];
  for (let i = 0; i < count; i++) {
    const str = buffer
      .slice(start + i * itemSize, start + (i + 1) * itemSize)
      .toString("utf-8");
    items.push(str.replace(/\0/g, "")); // Remove null characters and trim whitespace
  }
  return items;
};

// Function to unpack Quottery date
const unpackQuotteryDate = (data) => {
  const year = ((data >> 26) & 0x3f) + 24;
  const month = (data >> 22) & 0x0f;
  const day = (data >> 17) & 0x1f;
  const hour = (data >> 12) & 0x1f;
  const minute = (data >> 6) & 0x3f;
  const second = data & 0x3f;

  return { year, month, day, hour, minute, second };
};

const calculateBettingOdds = (currentNumSelection) => {
  const totalSelections = currentNumSelection.reduce(
    (acc, val) => acc + val,
    0
  );

  // Initialize betting_odds as an array of "1.0"
  let betting_odds = Array(currentNumSelection.length).fill("1.0");

  if (totalSelections > 0) {
    betting_odds = currentNumSelection.map((selection) =>
      selection > 0
        ? (totalSelections / selection).toString()
        : totalSelections.toString()
    );
  }

  return betting_odds;
};

const formatQuotteryDate = (dateObj) => {
  if (!dateObj) return "N/A";
  const year = dateObj.year.toString().padStart(2, "0");
  const month = dateObj.month.toString().padStart(2, "0");
  const day = dateObj.day.toString().padStart(2, "0");
  const hour = dateObj.hour.toString().padStart(2, "0");
  const minute = dateObj.minute.toString().padStart(2, "0");

  // Format the date and time similar to the old API structure
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:00`,
  };
};

const bufferToUint8Array = (buffer) => {
  return new Uint8Array(buffer);
};

export const fetchBetDetail = async (
  httpEndpoint,
  backendUrl,
  betId,
  coreNodeBetIds
) => {
  if (coreNodeBetIds.includes(betId)) {
    // Bet is in core node, use qubic-http API
    const bet = await fetchBetDetailFromCoreNode(httpEndpoint, betId);
    await fetchAndVerifyBetDescription(bet);
    return bet;
  } else {
    // Bet is not in core node, use the old backend API to fetch from historical database
    const bet = await fetchBetDetailFromBackendApi(backendUrl, betId);
    await fetchAndVerifyBetDescription(bet);
    return bet;
  }
};

export const fetchAndVerifyBetDescription = async (bet) => {
  const betId = bet.bet_id;

  // Verify if the full description is already cached
  const cachedDescription = getBetDescription(betId);
  if (cachedDescription) {
    bet.full_description = cachedDescription;
    bet.bet_desc = cachedDescription;
    return;
  }

  const isNewFormat = bet.bet_desc.startsWith("###");

  if (isNewFormat) {
    const qHelper = new QubicHelper();
    const encodedHash = bet.bet_desc.substring(3);
    const url = `${externalJsonAssetUrl}/bet_external_asset/${encodedHash}`;

    try {
      console.log(
        `[fetchAndVerifyBetDescription] Fetching new description from URL: ${url} for Bet ID ${betId}`
      );
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      const oracleIdentities =
        bet.oracle_id[0] instanceof Uint8Array
          ? await Promise.all(
              bet.oracle_id.map(async (p) => {
                return await qHelper.getIdentity(p);
              })
            )
          : bet.oracle_id;

      const creator =
        bet.creator instanceof Uint8Array
          ? await qHelper.getIdentity(bet.creator)
          : bet.creator;
      const firstPartHash = await hashBetData(
        data.description,
        creator,
        oracleIdentities,
        bet.option_desc
      );

      // Remove the unique identifier
      const encodedHashFirst = encodedHash.substring(0, 23);

      debuglog(
        "firstPartHash:",
        firstPartHash,
        "encodedHashFirst:",
        encodedHashFirst
      );

      // Compare the hashes
      if (firstPartHash !== encodedHashFirst) {
        throw new Error("Description hash does not match expected hash");
      } else {
        debuglog("Hash verified successfully!");
      }

      bet.full_description = data.description;
      bet.bet_desc = bet.full_description;

      // Add the description to the cache
      setBetDescription(betId, data.description);
    } catch (error) {
      console.error("Error fetching or verifying full description:", error);
      bet.full_description = "Description not available.";
      bet.description = bet.full_description;
    }
  } else {
    // Old format; use bet_desc as is
    bet.full_description = bet.bet_desc;
    // Add the description to the cache
    setBetDescription(betId, bet.bet_desc);
  }
};

export const fetchBetDetailFromBackendApi = async (backendUrl, betId) => {
  try {
    const response = await fetch(`${backendUrl}/get_all_bets`);
    const data = await response.json();

    if (data.bet_list) {
      const bet = data.bet_list.find((b) => b.bet_id === betId);

      if (bet) {
        // Parse list fields using JSON.parse
        bet.oracle_fee = JSON.parse(bet.oracle_fee);
        bet.oracle_id = JSON.parse(bet.oracle_id);
        bet.option_desc = JSON.parse(bet.option_desc);
        bet.betting_odds = JSON.parse(bet.betting_odds);
        bet.current_bet_state = JSON.parse(bet.current_bet_state);
        bet.current_num_selection = JSON.parse(bet.current_num_selection);
        bet.oracle_vote = JSON.parse(bet.oracle_vote);

        const closeDate = new Date(
          "20" + bet.close_date + "T" + bet.close_time + "Z"
        );
        const now = new Date();
        bet.is_active = now <= closeDate;

        // Normalize field names to match new API :-)
        bet.nOption = bet.no_options || bet.nOption;
        bet.maxBetSlotPerOption =
          bet.max_slot_per_option || bet.maxBetSlotPerOption;
        bet.amount_per_bet_slot = BigInt(bet.amount_per_bet_slot);
        bet.bet_id = parseInt(bet.bet_id);
        bet.current_total_qus = parseInt(bet.current_total_qus);
        bet.amount_per_bet_slot = BigInt(bet.amount_per_bet_slot);

        // For consistency, set oracle_public_keys to null (since we don't have them)
        bet.oracle_public_keys = null;

        return bet;
      } else {
        throw new Error(`Bet with id ${betId} not found in backend API.`);
      }
    } else {
      throw new Error("No bet_list in backend API response.");
    }
  } catch (error) {
    console.error("Error fetching bet detail from backend API:", error);
    throw error;
  }
};

// Function to fetch details of a specific bet given the bet id
export const fetchBetDetailFromCoreNode = async (
  httpEndpoint,
  betId,
  maxRetryCount = 3
) => {
  const betIdBuffer = Buffer.alloc(4);
  betIdBuffer.writeUInt32LE(betId, 0);
  const inputBase64 = Buffer.from(betIdBuffer).toString("base64");
  const query_smart_contract_api_uri = `${httpEndpoint}/v1/querySmartContract`;

  const json_data = makeJsonData(QTRY_CONTRACT_INDEX, 2, 4, inputBase64);
  let retry = 0;
  for (let attempt = 0; attempt < maxRetryCount; attempt++) {
    try {
      const response = await fetch(query_smart_contract_api_uri, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(json_data),
      });

      if (!response.ok) {
        throw new Error(
          `Error fetching bet details: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();
      const data = base64.decode(responseData.responseData);
      const buffer = Buffer.from(data, "binary");

      const nOption = buffer.readUInt32LE(4);
      const openDateRaw = unpackQuotteryDate(buffer.readUInt32LE(616));
      const closeDateRaw = unpackQuotteryDate(buffer.readUInt32LE(620));
      const endDateRaw = unpackQuotteryDate(buffer.readUInt32LE(624));

      const openDate = formatQuotteryDate(openDateRaw);
      const closeDate = formatQuotteryDate(closeDateRaw);
      const endDate = formatQuotteryDate(endDateRaw);

      const creator = bufferToUint8Array(buffer.slice(8, 40));

      const amountPerBetSlot = buffer.readBigUInt64LE(632); // Read uint64 minBetAmount

      // Parse and filter oracleProviderId to remove empty strings
      const oracleProviderId = [];
      for (let i = 0; i < 8; i++) {
        const start = 328 + i * 32;
        const end = start + 32;
        const idBuffer = buffer.slice(start, end);
        // Check if the idBuffer is not all zeros (empty)
        const isEmpty = idBuffer.every((byte) => byte === 0);
        if (!isEmpty) {
          const idUint8Array = bufferToUint8Array(idBuffer);
          oracleProviderId.push(idUint8Array);
        }
      }

      const oracleFees = Array.from(
        { length: oracleProviderId.length },
        (_, i) => buffer.readUInt32LE(584 + i * 4) / 100
      );
      const currentNumSelection = Array.from({ length: nOption }, (_, i) =>
        buffer.readUInt32LE(644 + i * 4)
      );

      const bettingOdds = calculateBettingOdds(currentNumSelection);

      // Calculate result based on oracle votes
      const betResultWonOption = Array.from(
        { length: oracleProviderId.length },
        (_, i) => buffer.readInt8(676 + i)
      );
      const betResultOPId = Array.from(
        { length: oracleProviderId.length },
        (_, i) => buffer.readInt8(684 + i)
      );

      let result = -1;
      if (oracleProviderId.length > 0) {
        const requiredVotes = Math.ceil((oracleProviderId.length * 2) / 3);
        const voteCount = new Map();

        // Count votes
        for (let i = 0; i < betResultOPId.length; i++) {
          const oracleIdx = betResultOPId[i];
          const optionVoted = betResultWonOption[i];
          if (oracleIdx !== -1 && optionVoted !== -1) {
            voteCount.set(optionVoted, (voteCount.get(optionVoted) || 0) + 1);
          }
        }

        // Find the option with the maximum votes
        let maxVotes = 0;
        let keyWithMaxVotes = -1;
        for (const [key, count] of voteCount.entries()) {
          if (count > maxVotes) {
            maxVotes = count;
            keyWithMaxVotes = key;
          }
        }

        // Check if the dominated votes meet the required votes
        if (maxVotes >= requiredVotes) {
          result = keyWithMaxVotes;
        }
      }

      if (retry !== 0) {
        console.log("Done retrying");
        retry = 0;
      }

      // Return unpacked bet details
      return {
        bet_id: buffer.readUInt32LE(0), // Read uint32 betId
        nOption: nOption, // Read uint32 nOption
        creator: creator,
        bet_desc: buffer
          .slice(40, 72)
          .toString("utf-8")
          .replace(/\0/g, "")
          .trim(), // Read and clean 32-byte bet description
        option_desc: parseFixedSizeStrings(buffer, 72, 256, 8, 32).filter(
          (id) => id.length > 0
        ), // Parse 8x 32-byte option descriptions
        oracle_id: oracleProviderId,
        oracle_fee: oracleFees,
        open_date: openDate.date,
        close_date: closeDate.date,
        end_date: endDate.date,
        open_time: openDate.time,
        close_time: closeDate.time,
        end_time: endDate.time,
        amount_per_bet_slot: amountPerBetSlot,
        maxBetSlotPerOption: buffer.readUInt32LE(640),
        current_bet_state: currentNumSelection,
        current_num_selection: currentNumSelection,
        betResultWonOption: betResultWonOption,
        betResultOPId: betResultOPId,
        current_total_qus:
          currentNumSelection.reduce((acc, val) => acc + val, 0) *
          Number(amountPerBetSlot),
        betting_odds: bettingOdds,
        result: result,
      };
    } catch (error) {
      console.error(
        `Attempt ${
          attempt + 1
        }: Error fetching bet details for betId ${betId} - ${error.message}`
      );

      if (attempt === maxRetryCount - 1) {
        console.error("Max retry attempts reached. Failing gracefully.");
        throw error; // Re-throw the error after the final attempt
      }

      console.log("Retrying...");
      retry++;
    }
  }
};

export const fetchParticipantsForBetOption = async (
  httpEndpoint,
  betId,
  optionId
) => {
  try {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(betId, 0);
    buffer.writeUInt32LE(optionId, 4);
    const inputBase64 = buffer.toString("base64");

    console.log(`fetchParticipantsForBetOption - betId: ${betId}, optionId: ${optionId}, inputBase64: ${inputBase64}`);

    const jsonData = makeJsonData(QTRY_CONTRACT_INDEX, 3, 8, inputBase64);
    const queryUri = `${httpEndpoint}/v1/querySmartContract`;

    const response = await fetch(queryUri, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(jsonData),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur fetchParticipantsForBetOption: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    console.log("fetchParticipantsForBetOption - responseData:", responseData);

    const decodedData = base64.decode(responseData.responseData);
    const buf = Buffer.from(decodedData, "binary");

    console.log("fetchParticipantsForBetOption - decodedData length:", buf.length);
    console.log("fetchParticipantsForBetOption - buffer contents (first 64 bytes):", buf.slice(0, 64));

    const participants = [];
    const qHelper = new QubicHelper();

    for (let i = 0; i < 1024; i++) { // 32 * 1024 / 32 = 1024 max participants
      const offset = i * 32;
      const pubKeyBytes = buf.slice(offset, offset + 32);

      // Vérifier si la clé publique n'est pas toute à zéro
      const isNonZero = pubKeyBytes.some(byte => byte !== 0);
      if (isNonZero) {
        const identity = await qHelper.getIdentity(new Uint8Array(pubKeyBytes));
        let slotCount = BigInt(0);
        participants.push({
          identity,
          publicKeyBytes: pubKeyBytes,
          slotCount,
        });
        console.log(`Participant ${i + 1}: ${identity}, Slot Count: ${slotCount}`);
      }
    }

    console.log(`fetchParticipantsForBetOption - Total participants: ${participants.length}`);

    return participants;
  } catch (error) {
    console.error("Error in fetchParticipantsForBetOption:", error);
    throw error;
  }
};
