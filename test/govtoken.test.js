const GovToken = artifacts.require("./GovToken.sol");

contract("GovToken", (accounts) => {
    let govTokenInstance;
    let address;

    beforeEach("Access deployed contract", async () => {
        // Access deployed contract
        govTokenInstance = await GovToken.deployed();
    });

    it("Sample Test", async () => {
        try {
            // Remove this line and write test
            assert.isTrue(true, "Didn't pass")
        } catch (err) {
            assert.isTrue(false, err.toString())
        }
    });


});
