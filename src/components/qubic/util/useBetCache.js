import React, { useState, useRef } from "react";
import { fetchBetDetail as fetchBetDetailAPI } from "./betApi";
import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";

export function useBetCache() {
  const cacheRef = useRef({}); 

  /**
   * Fetch details of a bet:
   * - If present in the cache, return it directly
   * - Otherwise, call the API, store the result and return it
   */
  const fetchBetDetail = async (httpEndpoint, backendUrl, betId, filteredBetIds) => {
    if (cacheRef.current[betId]) {
      // 1) Data is present in the cache
      return cacheRef.current[betId];
    } else {
      // 2) Data is not present in the cache
      const bet = await fetchBetDetailAPI(httpEndpoint, backendUrl, betId, filteredBetIds);

      const qHelper = new QubicHelper();
      bet.creator = await qHelper.getIdentity(bet.creator);
      bet.oracle_public_keys = bet.oracle_id;
      bet.oracle_id = await Promise.all(
        bet.oracle_id.map(async (oracleId) => {
          return await qHelper.getIdentity(oracleId);
        })
      );

      // Ex : Calcul is_active
      const closeDate = new Date("20" + bet.close_date + "T" + bet.close_time + "Z");
      const now = new Date();
      bet.is_active = now <= closeDate;

      // 3) Uploading the cache
      cacheRef.current[betId] = bet;
      return bet;
    }
  };

  return { fetchBetDetail };
}
