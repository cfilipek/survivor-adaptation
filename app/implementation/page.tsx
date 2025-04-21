import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Implementation() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-green-900 to-green-950">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-100 mb-4">Implementation Details</h1>
          <p className="text-xl text-green-200">Core C# Scripts for Survivor: Adaptation</p>
        </div>

        <Tabs defaultValue="gameManager" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="gameManager">Game Manager</TabsTrigger>
            <TabsTrigger value="organism">Organism</TabsTrigger>
            <TabsTrigger value="networkManager">Network Manager</TabsTrigger>
            <TabsTrigger value="uiManager">UI Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="gameManager">
            <Card>
              <CardHeader>
                <CardTitle>GameManager.cs</CardTitle>
                <CardDescription>The central controller for game flow and logic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="text-sm text-green-300 whitespace-pre-wrap">
                    {`using System.Collections;
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public class GameManager : NetworkBehaviour
{
    public static GameManager Instance { get; private set; }
    
    [SerializeField] private GameObject organismPrefab;
    
    // Game state
    public NetworkVariable<GameState> CurrentGameState = new NetworkVariable<GameState>();
    
    // Environment data
    [SerializeField] private List<EnvironmentData> environments = new List<EnvironmentData>();
    
    // Events
    [SerializeField] private List<EnvironmentEvent> grasslandEvents = new List<EnvironmentEvent>();
    [SerializeField] private List<EnvironmentEvent> desertEvents = new List<EnvironmentEvent>();
    [SerializeField] private List<EnvironmentEvent> tundraEvents = new List<EnvironmentEvent>();
    [SerializeField] private List<EnvironmentEvent> jungleEvents = new List<EnvironmentEvent>();
    [SerializeField] private List<EnvironmentEvent> cityEvents = new List<EnvironmentEvent>();
    
    // List of active players/organisms
    private List<NetworkOrganism> activeOrganisms = new List<NetworkOrganism>();
    
    // Track ready players
    private NetworkVariable<int> readyPlayerCount = new NetworkVariable<int>(0);
    private NetworkVariable<int> totalPlayerCount = new NetworkVariable<int>(0);
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();
        
        if (IsServer)
        {
            // Initialize game state
            CurrentGameState.Value = GameState.WaitingForPlayers;
            
            // Listen for player connections/disconnections
            NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
            NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
        }
        
        // Subscribe to game state changes
        CurrentGameState.OnValueChanged += OnGameStateChanged;
    }
    
    private void OnClientConnected(ulong clientId)
    {
        if (IsServer)
        {
            // Increment player count
            totalPlayerCount.Value++;
            
            // Spawn an organism for the new player
            GameObject organismObj = Instantiate(organismPrefab);
            NetworkObject networkObj = organismObj.GetComponent<NetworkObject>();
            networkObj.SpawnAsPlayerObject(clientId);
            
            // Add to active organisms
            activeOrganisms.Add(organismObj.GetComponent<NetworkOrganism>());
            
            // If this is the first player, show organism creation UI
            if (totalPlayerCount.Value == 1)
            {
                CurrentGameState.Value = GameState.OrganismCreation;
            }
        }
    }
    
    private void OnClientDisconnected(ulong clientId)
    {
        if (IsServer)
        {
            // Decrement player count
            totalPlayerCount.Value--;
            
            // Remove from active organisms
            activeOrganisms.RemoveAll(o => o.OwnerClientId == clientId);
            
            // If all players left, reset game
            if (totalPlayerCount.Value == 0)
            {
                CurrentGameState.Value = GameState.WaitingForPlayers;
            }
        }
    }
    
    [ServerRpc(RequireOwnership = false)]
    public void PlayerReady_ServerRpc(ServerRpcParams rpcParams = default)
    {
        // Increment ready count
        readyPlayerCount.Value++;
        
        // If all players are ready, move to next phase
        if (readyPlayerCount.Value >= totalPlayerCount.Value)
        {
            // Reset ready count for next phase
            readyPlayerCount.Value = 0;
            
            // Move to environment phase
            CurrentGameState.Value = GameState.EnvironmentPhase;
        }
    }
    
    private void OnGameStateChanged(GameState previous, GameState current)
    {
        // Handle UI and gameplay changes based on state
        UIManager.Instance.UpdateUIForGameState(current);
        
        if (IsServer)
        {
            // Handle server-side logic for the new state
            switch (current)
            {
                case GameState.OrganismCreation:
                    // Allow players to create organisms
                    ShowOrganismCreation_ClientRpc();
                    break;
                    
                case GameState.EnvironmentPhase:
                    // Start environment survival checks
                    StartCoroutine(RunEnvironmentPhase());
                    break;
                    
                case GameState.CityPhase:
                    // Start city challenge
                    StartCoroutine(RunCityPhase());
                    break;
                    
                case GameState.Results:
                    // Show final results
                    CalculateResults();
                    break;
            }
        }
    }
    
    [ClientRpc]
    private void ShowOrganismCreation_ClientRpc()
    {
        UIManager.Instance.ShowOrganismCreationUI();
    }
    
    private IEnumerator RunEnvironmentPhase()
    {
        // Process environment survival for all organisms
        foreach (var organism in activeOrganisms)
        {
            // Skip extinct organisms
            if (organism.Status.Value == "extinct")
                continue;
                
            // Calculate survival
            string environment = organism.Environment.Value;
            string result = organism.GetComponent<Organism>().CalculateSurvival(environment);
            
            // Broadcast result to all clients
            ShowSurvivalResult_ClientRpc(organism.OwnerClientId, result);
            
            // Wait a moment between each organism
            yield return new WaitForSeconds(1.5f);
            
            // Trigger environmental event if survived
            if (organism.Status.Value != "extinct")
            {
                TriggerEnvironmentalEvent(organism);
                yield return new WaitForSeconds(2.0f);
            }
        }
        
        // Wait before moving to next phase
        yield return new WaitForSeconds(3.0f);
        
        // Check if any organisms survived
        bool anyOrganismsSurvived = activeOrganisms.Exists(o => o.Status.Value != "extinct");
        
        if (anyOrganismsSurvived)
        {
            // Move to city phase
            CurrentGameState.Value = GameState.CityPhase;
        }
        else
        {
            // Skip to results if all extinct
            CurrentGameState.Value = GameState.Results;
        }
    }
    
    private void TriggerEnvironmentalEvent(NetworkOrganism organism)
    {
        // Get random event for the organism's environment
        EnvironmentEvent environmentEvent = GetRandomEventForEnvironment(organism.Environment.Value);
        
        // Broadcast event to all clients
        ShowEnvironmentEvent_ClientRpc(organism.OwnerClientId, environmentEvent.description);
        
        // Calculate impact
        int impact = Random.Range(1, 11); // 1-10
        
        if (impact > 7)
        {
            // Severe impact - downgrade status
            if (organism.Status.Value == "thriving")
                organism.Status.Value = "surviving";
            else if (organism.Status.Value == "surviving")
                organism.Status.Value = "struggling";
            else if (organism.Status.Value == "struggling")
                organism.Status.Value = "extinct";
                
            // Broadcast impact result
            ShowEventImpact_ClientRpc(organism.OwnerClientId, true);
        }
        else
        {
            // Organism weathered the event
            ShowEventImpact_ClientRpc(organism.OwnerClientId, false);
        }
    }
    
    private EnvironmentEvent GetRandomEventForEnvironment(string environment)
    {
        List<EnvironmentEvent> events;
        
        switch (environment)
        {
            case "Grassland":
                events = grasslandEvents;
                break;
            case "Desert":
                events = desertEvents;
                break;
            case "Tundra":
                events = tundraEvents;
                break;
            case "Jungle":
                events = jungleEvents;
                break;
            default:
                events = grasslandEvents;
                break;
        }
        
        return events[Random.Range(0, events.Count)];
    }
    
    private IEnumerator RunCityPhase()
    {
        // Process city challenge for all surviving organisms
        foreach (var organism in activeOrganisms)
        {
            // Skip extinct organisms
            if (organism.Status.Value == "extinct")
                continue;
                
            // Show city challenge intro for this organism
            ShowCityChallenge_ClientRpc(organism.OwnerClientId);
            yield return new WaitForSeconds(1.5f);
            
            // Calculate city compatibility
            float cityCompatibility = CalculateCityCompatibility(organism);
            
            // Determine outcome
            string result;
            if (cityCompatibility >= 5)
            {
                organism.Status.Value = "city_survivor";
                result = "SUCCESS";
            }
            else if (cityCompatibility >= 3)
            {
                organism.Status.Value = "city_adapter";
                result = "PARTIAL SUCCESS";
            }
            else
            {
                organism.Status.Value = "extinct";
                result = "FAILURE";
            }
            
            // Broadcast result
            ShowCityResult_ClientRpc(organism.OwnerClientId, result);
            
            // Wait between organisms
            yield return new WaitForSeconds(2.0f);
        }
        
        // Wait before showing results
        yield return new WaitForSeconds(3.0f);
        
        // Move to results phase
        CurrentGameState.Value = GameState.Results;
    }
    
    private float CalculateCityCompatibility(NetworkOrganism organism)
    {
        float compatibility = 0;
        
        // Get stats dictionary
        Dictionary<string, int> stats = new Dictionary<string, int>();
        foreach (var pair in organism.Stats.Value)
        {
            stats[pair.Key] = pair.Value;
        }
        
        // Calculate based on stats
        compatibility += GetStatValue(stats, "adaptability") * 1.0f;
        compatibility += GetStatValue(stats, "nocturnal") * 0.7f;
        compatibility += GetStatValue(stats, "speed") * 0.5f;
        compatibility += GetStatValue(stats, "climbing") * 0.6f;
        compatibility += GetStatValue(stats, "reproduction_rate") * 0.4f;
        
        // Kingdom-specific bonuses
        if (organism.Kingdom.Value == "Bacteria")
            compatibility += 2;
        else if (organism.Kingdom.Value == "Fungi")
            compatibility += 1;
        else if (organism.Kingdom.Value == "Plant")
            compatibility -= 1;
            
        return compatibility;
    }
    
    private int GetStatValue(Dictionary<string, int> stats, string statName)
    {
        if (stats.TryGetValue(statName, out int value))
        {
            return value;
        }
        return 0;
    }
    
    private void CalculateResults()
    {
        // Get survivors
        List<NetworkOrganism> survivors = activeOrganisms.FindAll(o => o.Status.Value != "extinct");
        
        // Broadcast results to all clients
        ShowResults_ClientRpc(survivors.Count);
        
        // If multiple survivors, determine a winner
        if (survivors.Count > 1)
        {
            // Prefer city_survivor status
            List<NetworkOrganism> citySurvivors = survivors.FindAll(o => o.Status.Value == "city_survivor");
            
            NetworkOrganism winner;
            if (citySurvivors.Count > 0)
            {
                // Pick random city survivor
                winner = citySurvivors[Random.Range(0, citySurvivors.Count)];
            }
            else
            {
                // Pick random survivor
                winner = survivors[Random.Range(0, survivors.Count)];
            }
            
            // Broadcast winner
            DeclareWinner_ClientRpc(winner.OwnerClientId);
        }
    }
    
    [ClientRpc]
    private void ShowSurvivalResult_ClientRpc(ulong clientId, string result)
    {
        UIManager.Instance.ShowSurvivalResult(clientId, result);
    }
    
    [ClientRpc]
    private void ShowEnvironmentEvent_ClientRpc(ulong clientId, string eventDescription)
    {
        UIManager.Instance.ShowEnvironmentEvent(clientId, eventDescription);
    }
    
    [ClientRpc]
    private void ShowEventImpact_ClientRpc(ulong clientId, bool severe)
    {
        UIManager.Instance.ShowEventImpact(clientId, severe);
    }
    
    [ClientRpc]
    private void ShowCityChallenge_ClientRpc(ulong clientId)
    {
        UIManager.Instance.ShowCityChallenge(clientId);
    }
    
    [ClientRpc]
    private void ShowCityResult_ClientRpc(ulong clientId, string result)
    {
        UIManager.Instance.ShowCityResult(clientId, result);
    }
    
    [ClientRpc]
    private void ShowResults_ClientRpc(int survivorCount)
    {
        UIManager.Instance.ShowResults(survivorCount);
    }
    
    [ClientRpc]
    private void DeclareWinner_ClientRpc(ulong winnerId)
    {
        UIManager.Instance.DeclareWinner(winnerId);
    }
    
    public enum GameState
    {
        WaitingForPlayers,
        OrganismCreation,
        EnvironmentPhase,
        CityPhase,
        Results
    }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organism">
            <Card>
              <CardHeader>
                <CardTitle>Organism.cs & NetworkOrganism.cs</CardTitle>
                <CardDescription>Core data structure and logic for organisms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="text-sm text-green-300 whitespace-pre-wrap">
                    {`// NetworkOrganism.cs - Handles network synchronization
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public class NetworkOrganism : NetworkBehaviour
{
    // Network variables for organism data
    public NetworkVariable<string> OrganismName = new NetworkVariable<string>();
    public NetworkVariable<string> Kingdom = new NetworkVariable<string>();
    public NetworkVariable<string> Environment = new NetworkVariable<string>();
    public NetworkVariable<string> Status = new NetworkVariable<string>();
    
    // Custom network variable for stats dictionary
    public NetworkDictionaryVariable<string, int> Stats = new NetworkDictionaryVariable<string, int>();
    
    // Override OnNetworkSpawn to initialize
    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn();
        
        if (IsOwner)
        {
            // Initialize with local data
            SetOrganismData_ServerRpc(
                PlayerData.Instance.OrganismName,
                PlayerData.Instance.Kingdom,
                PlayerData.Instance.Environment,
                PlayerData.Instance.Stats
            );
        }
    }
    
    [ServerRpc]
    public void SetOrganismData_ServerRpc(string name, string kingdom, string environment, Dictionary<string, int> stats)
    {
        OrganismName.Value = name;
        Kingdom.Value = kingdom;
        Environment.Value = environment;
        Status.Value = "alive";
        
        // Clear and update stats
        Stats.Value.Clear();
        foreach (var stat in stats)
        {
            Stats.Value[stat.Key] = stat.Value;
        }
    }
}

// Organism.cs - Handles gameplay logic
using System.Collections.Generic;
using UnityEngine;

public class Organism : MonoBehaviour
{
    // Reference to network component
    private NetworkOrganism networkData;
    
    // Local references for convenience
    private string organismName;
    private string kingdom;
    private string environment;
    private Dictionary<string, int> stats = new Dictionary<string, int>();
    private string status = "alive";
    
    // Visual representation
    [SerializeField] private SpriteRenderer organismSprite;
    [SerializeField] private Animator animator;
    
    private void Awake()
    {
        networkData = GetComponent<NetworkOrganism>();
    }
    
    private void Start()
    {
        // Subscribe to network variable changes
        networkData.OrganismName.OnValueChanged += (prev, current) => {
            organismName = current;
            UpdateVisuals();
        };
        
        networkData.Kingdom.OnValueChanged += (prev, current) => {
            kingdom = current;
            UpdateVisuals();
        };
        
        networkData.Environment.OnValueChanged += (prev, current) => {
            environment = current;
            UpdateVisuals();
        };
        
        networkData.Status.OnValueChanged += (prev, current) => {
            status = current;
            UpdateVisuals();
        };
        
        // Initialize local values
        organismName = networkData.OrganismName.Value;
        kingdom = networkData.Kingdom.Value;
        environment = networkData.Environment.Value;
        status = networkData.Status.Value;
        
        // Copy stats dictionary
        foreach (var pair in networkData.Stats.Value)
        {
            stats[pair.Key] = pair.Value;
        }
        
        // Initial visual update
        UpdateVisuals();
    }
    
    private void UpdateVisuals()
    {
        // Update sprite based on kingdom
        switch (kingdom)
        {
            case "Animal":
                organismSprite.sprite = ResourceManager.Instance.GetAnimalSprite();
                break;
            case "Plant":
                organismSprite.sprite = ResourceManager.Instance.GetPlantSprite();
                break;
            case "Fungi":
                organismSprite.sprite = ResourceManager.Instance.GetFungiSprite();
                break;
            case "Protist":
                organismSprite.sprite = ResourceManager.Instance.GetProtistSprite();
                break;
            case "Bacteria":
                organismSprite.sprite = ResourceManager.Instance.GetBacteriaSprite();
                break;
        }
        
        // Update color based on status
        switch (status)
        {
            case "thriving":
                organismSprite.color = Color.green;
                break;
            case "surviving":
                organismSprite.color = Color.yellow;
                break;
            case "struggling":
                organismSprite.color = new Color(1.0f, 0.5f, 0.0f); // Orange
                break;
            case "extinct":
                organismSprite.color = Color.red;
                break;
            case "city_survivor":
                organismSprite.color = new Color(0.0f, 1.0f, 1.0f); // Cyan
                break;
            case "city_adapter":
                organismSprite.color = new Color(0.5f, 0.5f, 1.0f); // Light blue
                break;
        }
    }
    
    public string CalculateSurvival(string currentEnvironment)
    {
        float compatibility = CalculateCompatibility(currentEnvironment);
        
        if (compatibility >= 8)
        {
            return "THRIVING";
        }
        else if (compatibility >= 5)
        {
            return "SURVIVING";
        }
        else if (compatibility >= 3)
        {
            return "STRUGGLING";
        }
        else
        {
            return "EXTINCT";
        }
    }
    
    private float CalculateCompatibility(string currentEnvironment)
    {
        float compatibility = 0;
        
        // Calculate based on environment and stats
        switch (currentEnvironment)
        {
            case "Grassland":
                compatibility += GetStatValue("speed") * 0.8f;
                compatibility += GetStatValue("camouflage") * 0.6f;
                compatibility += GetStatValue("drought_resistance") * 0.4f;
                compatibility += GetStatValue("cold_resistance") * 0.2f;
                compatibility -= GetStatValue("aquatic") * 0.5f;
                break;
                
            case "Desert":
                compatibility += GetStatValue("drought_resistance") * 1.0f;
                compatibility += GetStatValue("heat_resistance") * 0.8f;
                compatibility += GetStatValue("nocturnal") * 0.6f;
                compatibility -= GetStatValue("aquatic") * 0.8f;
                compatibility -= GetStatValue("cold_resistance") * 0.4f;
                break;
                
            case "Tundra":
                compatibility += GetStatValue("cold_resistance") * 1.0f;
                compatibility += GetStatValue("fur") * 0.8f;
                compatibility += GetStatValue("hibernation") * 0.6f;
                compatibility -= GetStatValue("heat_resistance") * 0.6f;
                break;
                
            case "Jungle":
                compatibility += GetStatValue("climbing") * 0.8f;
                compatibility += GetStatValue("camouflage") * 0.7f;
                compatibility += GetStatValue("aquatic") * 0.5f;
                compatibility += GetStatValue("heat_resistance") * 0.4f;
                compatibility -= GetStatValue("drought_resistance") * 0.3f;
                break;
        }
        
        // Kingdom-specific bonuses
        switch (kingdom)
        {
            case "Animal":
                if (currentEnvironment == "Grassland") compatibility += 1.0f;
                break;
            case "Plant":
                if (currentEnvironment == "Grassland" || currentEnvironment == "Jungle") compatibility += 1.0f;
                break;
            case "Fungi":
                if (currentEnvironment == "Jungle") compatibility += 1.0f;
                break;
            case "Protist":
                if (currentEnvironment == "Jungle") compatibility += 0.5f;
                break;
            case "Bacteria":
                compatibility += 0.5f; // Adaptable to all environments
                break;
        }
        
        return compatibility;
    }
    
    private int GetStatValue(string statName)
    {
        if (stats.TryGetValue(statName, out int value))
        {
            return value;
        }
        return 0;
    }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="networkManager">
            <Card>
              <CardHeader>
                <CardTitle>NetworkSetup.cs</CardTitle>
                <CardDescription>Handles connection and network setup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="text-sm text-green-300 whitespace-pre-wrap">
                    {`using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class NetworkSetup : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private Button hostButton;
    [SerializeField] private Button clientButton;
    [SerializeField] private TMP_InputField ipAddressInput;
    [SerializeField] private TMP_InputField playerNameInput;
    [SerializeField] private GameObject connectionPanel;
    [SerializeField] private TextMeshProUGUI statusText;
    
    [Header("Network Settings")]
    [SerializeField] private int defaultPort = 7777;
    
    private void Start()
    {
        // Set default IP to localhost
        ipAddressInput.text = "127.0.0.1";
        
        // Add button listeners
        hostButton.onClick.AddListener(HostGame);
        clientButton.onClick.AddListener(JoinGame);
        
        // Subscribe to network events
        NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
        NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
        NetworkManager.Singleton.OnServerStarted += OnServerStarted;
    }
    
    private void HostGame()
    {
        // Save player name
        if (string.IsNullOrEmpty(playerNameInput.text))
        {
            statusText.text = "Please enter a name!";
            return;
        }
        
        PlayerData.Instance.PlayerName = playerNameInput.text;
        
        // Start as host (both server and client)
        NetworkManager.Singleton.StartHost();
        
        statusText.text = "Starting host...";
    }
    
    private void JoinGame()
    {
        // Save player name
        if (string.IsNullOrEmpty(playerNameInput.text))
        {
            statusText.text = "Please enter a name!";
            return;
        }
        
        PlayerData.Instance.PlayerName = playerNameInput.text;
        
        // Get IP address from input
        string ipAddress = ipAddressInput.text;
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = "127.0.0.1";
        }
        
        // Configure transport
        UnityTransport transport = NetworkManager.Singleton.GetComponent<UnityTransport>();
        transport.ConnectionData.Address = ipAddress;
        transport.ConnectionData.Port = (ushort)defaultPort;
        
        // Start as client
        NetworkManager.Singleton.StartClient();
        
        statusText.text = $"Connecting to {ipAddress}:{defaultPort}...";
    }
    
    private void OnServerStarted()
    {
        Debug.Log("Server started!");
    }
    
    private void OnClientConnected(ulong clientId)
    {
        Debug.Log($"Client connected: {clientId}");
        
        // Hide connection panel when connected
        if (NetworkManager.Singleton.IsClient)
        {
            connectionPanel.SetActive(false);
        }
    }
    
    private void OnClientDisconnected(ulong clientId)
    {
        Debug.Log($"Client disconnected: {clientId}");
        
        // Show connection panel again if we're the one who disconnected
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            connectionPanel.SetActive(true);
            statusText.text = "Disconnected from server.";
        }
    }
}

// Custom network dictionary variable implementation
using System;
using System.Collections.Generic;
using Unity.Collections;
using Unity.Netcode;

public class NetworkDictionaryVariable<TKey, TValue> : NetworkVariableBase
{
    private readonly Dictionary<TKey, TValue> m_Dictionary = new Dictionary<TKey, TValue>();
    
    public Dictionary<TKey, TValue> Value => m_Dictionary;
    
    public NetworkDictionaryVariable(NetworkVariableReadPermission readPerm = NetworkVariableReadPermission.Everyone, 
                                    NetworkVariableWritePermission writePerm = NetworkVariableWritePermission.Server)
        : base(readPerm, writePerm)
    {
    }
    
    public override void ResetDirty()
    {
        base.ResetDirty();
    }
    
    public override bool IsDirty()
    {
        return base.IsDirty();
    }
    
    public override void WriteDelta(FastBufferWriter writer)
    {
        if (!IsReadOnly)
        {
            writer.WriteValueSafe((byte)NetworkDictionaryEvent.Add);
            writer.WriteValueSafe(m_Dictionary.Count);
            
            foreach (var pair in m_Dictionary)
            {
                WriteKey(writer, pair.Key);
                WriteValue(writer, pair.Value);
            }
        }
    }
    
    public override void WriteField(FastBufferWriter writer)
    {
        writer.WriteValueSafe(m_Dictionary.Count);
        
        foreach (var pair in m_Dictionary)
        {
            WriteKey(writer, pair.Key);
            WriteValue(writer, pair.Value);
        }
    }
    
    public override void ReadField(FastBufferReader reader)
    {
        m_Dictionary.Clear();
        
        reader.ReadValueSafe(out int count);
        
        for (int i = 0; i < count; i++)
        {
            TKey key = ReadKey(reader);
            TValue value = ReadValue(reader);
            m_Dictionary[key] = value;
        }
    }
    
    public override void ReadDelta(FastBufferReader reader, bool keepDirtyDelta)
    {
        reader.ReadValueSafe(out byte operation);
        
        switch ((NetworkDictionaryEvent)operation)
        {
            case NetworkDictionaryEvent.Add:
                reader.ReadValueSafe(out int count);
                
                m_Dictionary.Clear();
                for (int i = 0; i < count; i++)
                {
                    TKey key = ReadKey(reader);
                    TValue  i++)
                {
                    TKey key = ReadKey(reader);
                    TValue value = ReadValue(reader);
                    m_Dictionary[key] = value;
                }
                break;
        }
    }
    
    private void WriteKey(FastBufferWriter writer, TKey key)
    {
        if (typeof(TKey) == typeof(string))
        {
            writer.WriteValueSafe(key as string);
        }
        else
        {
            writer.WriteValueSafe((dynamic)key);
        }
    }
    
    private void WriteValue(FastBufferWriter writer, TValue value)
    {
        if (typeof(TValue) == typeof(string))
        {
            writer.WriteValueSafe(value as string);
        }
        else
        {
            writer.WriteValueSafe((dynamic)value);
        }
    }
    
    private TKey ReadKey(FastBufferReader reader)
    {
        if (typeof(TKey) == typeof(string))
        {
            reader.ReadValueSafe(out string value);
            return (TKey)(object)value;
        }
        else
        {
            reader.ReadValueSafe(out TKey value);
            return value;
        }
    }
    
    private TValue ReadValue(FastBufferReader reader)
    {
        if (typeof(TValue) == typeof(string))
        {
            reader.ReadValueSafe(out string value);
            return (TValue)(object)value;
        }
        else
        {
            reader.ReadValueSafe(out TValue value);
            return value;
        }
    }
    
    private enum NetworkDictionaryEvent : byte
    {
        Add,
        Remove,
        Clear
    }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uiManager">
            <Card>
              <CardHeader>
                <CardTitle>UIManager.cs</CardTitle>
                <CardDescription>Manages all UI elements and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="text-sm text-green-300 whitespace-pre-wrap">
                    {`using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.UI;
using Unity.Netcode;

public class UIManager : MonoBehaviour
{
    public static UIManager Instance { get; private set; }
    
    [Header("UI Panels")]
    [SerializeField] private GameObject connectionPanel;
    [SerializeField] private GameObject organismCreationPanel;
    [SerializeField] private GameObject gameplayPanel;
    [SerializeField] private GameObject resultsPanel;
    
    [Header("Organism Creation UI")]
    [SerializeField] private TMP_InputField nameInput;
    [SerializeField] private TMP_Dropdown kingdomDropdown;
    [SerializeField] private TMP_Dropdown environmentDropdown;
    [SerializeField] private Transform statsContainer;
    [SerializeField] private GameObject statSliderPrefab;
    [SerializeField] private TextMeshProUGUI pointsText;
    [SerializeField] private Button createButton;
    
    [Header("Gameplay UI")]
    [SerializeField] private TextMeshProUGUI gameStateText;
    [SerializeField] private TextMeshProUGUI eventText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private Transform organismStatusContainer;
    [SerializeField] private GameObject organismStatusPrefab;
    
    [Header("Results UI")]
    [SerializeField] private TextMeshProUGUI resultsText;
    [SerializeField] private Button playAgainButton;
    [SerializeField] private Button quitButton;
    [SerializeField] private Transform survivorListContainer;
    [SerializeField] private GameObject survivorEntryPrefab;
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void Start()
    {
        // Set up button listeners
        playAgainButton.onClick.AddListener(OnPlayAgainClicked);
        quitButton.onClick.AddListener(OnQuitClicked);
        
        // Hide all panels initially
        connectionPanel.SetActive(true);
        organismCreationPanel.SetActive(false);
        gameplayPanel.SetActive(false);
        resultsPanel.SetActive(false);
    }
    
    public void UpdateUIForGameState(GameManager.GameState state)
    {
        switch (state)
        {
            case GameManager.GameState.WaitingForPlayers:
                connectionPanel.SetActive(true);
                organismCreationPanel.SetActive(false);
                gameplayPanel.SetActive(false);
                resultsPanel.SetActive(false);
                break;
                
            case GameManager.GameState.OrganismCreation:
                connectionPanel.SetActive(false);
                organismCreationPanel.SetActive(true);
                gameplayPanel.SetActive(false);
                resultsPanel.SetActive(false);
                break;
                
            case GameManager.GameState.EnvironmentPhase:
                connectionPanel.SetActive(false);
                organismCreationPanel.SetActive(false);
                gameplayPanel.SetActive(true);
                resultsPanel.SetActive(false);
                gameStateText.text = "Environment Survival Phase";
                break;
                
            case GameManager.GameState.CityPhase:
                connectionPanel.SetActive(false);
                organismCreationPanel.SetActive(false);
                gameplayPanel.SetActive(true);
                resultsPanel.SetActive(false);
                gameStateText.text = "City Survival Challenge";
                break;
                
            case GameManager.GameState.Results:
                connectionPanel.SetActive(false);
                organismCreationPanel.SetActive(false);
                gameplayPanel.SetActive(false);
                resultsPanel.SetActive(true);
                break;
        }
    }
    
    public void ShowOrganismCreationUI()
    {
        // Reset UI elements
        nameInput.text = "";
        kingdomDropdown.value = 0;
        environmentDropdown.value = 0;
        
        // Clear stat sliders
        foreach (Transform child in statsContainer)
        {
            Destroy(child.gameObject);
        }
        
        // Show the panel
        organismCreationPanel.SetActive(true);
    }
    
    public void ShowSurvivalResult(ulong clientId, string result)
    {
        // Only update UI for local player
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            statusText.text = $"Survival Result: {result}";
        }
        
        // Update organism status display for all players
        UpdateOrganismStatusDisplay();
    }
    
    public void ShowEnvironmentEvent(ulong clientId, string eventDescription)
    {
        // Only update UI for local player
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            eventText.text = $"Event: {eventDescription}";
        }
    }
    
    public void ShowEventImpact(ulong clientId, bool severe)
    {
        // Only update UI for local player
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            if (severe)
            {
                eventText.text += "\n<color=red>The event had a severe impact!</color>";
            }
            else
            {
                eventText.text += "\n<color=green>Your organism weathered the event successfully!</color>";
            }
        }
        
        // Update organism status display for all players
        UpdateOrganismStatusDisplay();
    }
    
    public void ShowCityChallenge(ulong clientId)
    {
        // Only update UI for local player
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            eventText.text = "Your organism enters the concrete jungle of NYC...";
        }
    }
    
    public void ShowCityResult(ulong clientId, string result)
    {
        // Only update UI for local player
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            switch (result)
            {
                case "SUCCESS":
                    eventText.text += "\n<color=green>SUCCESS! Your organism adapts to city life and thrives!</color>";
                    break;
                case "PARTIAL SUCCESS":
                    eventText.text += "\n<color=yellow>PARTIAL SUCCESS! Your organism finds a niche in the city and survives.</color>";
                    break;
                case "FAILURE":
                    eventText.text += "\n<color=red>FAILURE! Your organism cannot adapt to urban life and perishes.</color>";
                    break;
            }
        }
        
        // Update organism status display for all players
        UpdateOrganismStatusDisplay();
    }
    
    public void ShowResults(int survivorCount)
    {
        // Clear previous survivor entries
        foreach (Transform child in survivorListContainer)
        {
            Destroy(child.gameObject);
        }
        
        if (survivorCount == 0)
        {
            resultsText.text = "All organisms went extinct! Nature is harsh.";
        }
        else
        {
            resultsText.text = $"Survivors: {survivorCount}";
            
            // Survivor entries will be populated by the GameManager
        }
    }
    
    public void DeclareWinner(ulong winnerId)
    {
        // Get the winner's name
        string winnerName = "Unknown";
        
        // Find the organism with the matching client ID
        NetworkOrganism[] organisms = FindObjectsOfType<NetworkOrganism>();
        foreach (var organism in organisms)
        {
            if (organism.OwnerClientId == winnerId)
            {
                winnerName = organism.OrganismName.Value;
                break;
            }
        }
        
        // Update results text
        resultsText.text += $"\n\nThe ultimate survivor is {winnerName}!";
        
        // Highlight the winner in the survivor list
        foreach (Transform child in survivorListContainer)
        {
            TextMeshProUGUI nameText = child.Find("NameText").GetComponent<TextMeshProUGUI>();
            if (nameText.text == winnerName)
            {
                child.GetComponent<Image>().color = new Color(0.8f, 1.0f, 0.8f);
                break;
            }
        }
    }
    
    private void UpdateOrganismStatusDisplay()
    {
        // Clear previous status entries
        foreach (Transform child in organismStatusContainer)
        {
            Destroy(child.gameObject);
        }
        
        // Create status entry for each organism
        NetworkOrganism[] organisms = FindObjectsOfType<NetworkOrganism>();
        foreach (var organism in organisms)
        {
            GameObject statusObj = Instantiate(organismStatusPrefab, organismStatusContainer);
            
            // Set organism info
            statusObj.transform.Find("NameText").GetComponent<TextMeshProUGUI>().text = organism.OrganismName.Value;
            statusObj.transform.Find("KingdomText").GetComponent<TextMeshProUGUI>().text = organism.Kingdom.Value;
            
            // Set status with appropriate color
            TextMeshProUGUI statusText = statusObj.transform.Find("StatusText").GetComponent<TextMeshProUGUI>();
            switch (organism.Status.Value)
            {
                case "thriving":
                    statusText.text = "THRIVING";
                    statusText.color = Color.green;
                    break;
                case "surviving":
                    statusText.text = "SURVIVING";
                    statusText.color = Color.yellow;
                    break;
                case "struggling":
                    statusText.text = "STRUGGLING";
                    statusText.color = new Color(1.0f, 0.5f, 0.0f); // Orange
                    break;
                case "extinct":
                    statusText.text = "EXTINCT";
                    statusText.color = Color.red;
                    break;
                case "city_survivor":
                    statusText.text = "CITY SURVIVOR";
                    statusText.color = new Color(0.0f, 1.0f, 1.0f); // Cyan
                    break;
                case "city_adapter":
                    statusText.text = "CITY ADAPTER";
                    statusText.color = new Color(0.5f, 0.5f, 1.0f); // Light blue
                    break;
            }
            
            // Highlight local player's organism
            if (organism.IsOwner)
            {
                statusObj.GetComponent<Image>().color = new Color(0.8f, 0.8f, 1.0f);
            }
        }
    }
    
    private void OnPlayAgainClicked()
    {
        // Reset game state if we're the host
        if (NetworkManager.Singleton.IsHost || NetworkManager.Singleton.IsServer)
        {
            GameManager.Instance.ResetGame_ServerRpc();
        }
    }
    
    private void OnQuitClicked()
    {
        // Disconnect from the network
        NetworkManager.Singleton.Shutdown();
        
        // Show connection panel
        connectionPanel.SetActive(true);
        organismCreationPanel.SetActive(false);
        gameplayPanel.SetActive(false);
        resultsPanel.SetActive(false);
    }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
