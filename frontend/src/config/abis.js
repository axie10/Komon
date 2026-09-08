export const FACTORY_ABI = [
  "function createPot(string,address,address[],uint256,uint256) returns (address)",
  "function getPotsByMember(address) view returns (address[])",
  "function getPotsByCreator(address) view returns (address[])",
  "function getAllPots() view returns (address[])",
  "function getTotalPots() view returns (uint256)",
  "event PotCreated(address indexed potAddress, address indexed creator, string name, address token, uint256 contributionAmount, uint256 memberCount, uint256 deadline)",
];

export const POT_ABI = [
  // View — Config
  "function name() view returns (string)",
  "function creator() view returns (address)",
  "function token() view returns (address)",
  "function contributionAmount() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function refundPerMember() view returns (uint256)",

  // View — State
  "function state() view returns (uint8)",
  "function totalFunds() view returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function contributionsReceived() view returns (uint256)",

  // View — Membership
  "function getMemberCount() view returns (uint256)",
  "function getMembers() view returns (address[])",
  "function isMember(address) view returns (bool)",
  "function hasContributed(address) view returns (bool)",
  "function hasClaimedRefund(address) view returns (bool)",

  // View — Proposals
  "function getProposal(uint256) view returns (address,address,uint256,string,string,uint256,uint256,uint8)",
  "function hasVotedOnProposal(uint256,address) view returns (bool)",
  "function hasVotedCancelOnProposal(uint256,address) view returns (bool)",
  "function proposals(uint256) view returns (uint256 id, address proposer, address recipient, uint256 amount, string description, string tag, uint256 votesFor, uint256 votesAgainst, uint8 state, uint256 cancelVotes)",


  // Write — Contributions
  "function contribute() payable",

  // Write — Proposals
  "function createProposal(address,uint256,string,string) returns (uint256)",
  "function vote(uint256,bool)",
  "function executeProposal(uint256)",
  "function cancelProposal(uint256)",

  // Write — Lifecycle
  "function cancelPot()",
  "function emergencyExit()",
  "function closePot()",
  "function claimRefund()",
];