(() => {
  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function calculate({ invoiced, received, thirdParties = [] } = {}) {
    const invoiceTotal = Number(invoiced);
    const receivedTotal = Number(received);
    const parties = Array.isArray(thirdParties)
      ? thirdParties.map((party) => ({
          name: String(party?.name || ""),
          amount: Math.max(0, Number(party?.amount) || 0)
        }))
      : [];
    const thirdPartyGross = parties.reduce((sum, party) => sum + party.amount, 0);

    if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0 || !Number.isFinite(receivedTotal) || receivedTotal < 0) {
      return { ok: false, code: "missing_totals" };
    }
    if (receivedTotal > invoiceTotal) {
      return { ok: false, code: "received_exceeds_invoiced" };
    }
    if (thirdPartyGross > invoiceTotal) {
      return { ok: false, code: "third_parties_exceed_invoiced" };
    }

    const totalRetention = invoiceTotal - receivedTotal;
    const retentionRate = totalRetention / invoiceTotal;
    const myGross = invoiceTotal - thirdPartyGross;
    const myRetention = myGross * retentionRate;
    const myNet = myGross - myRetention;
    const thirdPartyRetention = thirdPartyGross * retentionRate;
    const thirdPartyPayable = thirdPartyGross - thirdPartyRetention;
    const partyBreakdown = parties.map((party) => {
      const allocatedRetention = party.amount * retentionRate;
      return {
        name: party.name,
        gross: money(party.amount),
        retention: money(allocatedRetention),
        payable: money(party.amount - allocatedRetention)
      };
    });

    return {
      ok: true,
      invoiced: money(invoiceTotal),
      received: money(receivedTotal),
      totalRetention: money(totalRetention),
      retentionRate,
      myGross: money(myGross),
      myRetention: money(myRetention),
      myNet: money(myNet),
      thirdPartyGross: money(thirdPartyGross),
      thirdPartyRetention: money(thirdPartyRetention),
      thirdPartyPayable: money(thirdPartyPayable),
      thirdParties: partyBreakdown,
      reconciliation: money(myNet + thirdPartyPayable)
    };
  }

  globalThis.SDLivePassThroughMath = Object.freeze({ calculate });
})();
