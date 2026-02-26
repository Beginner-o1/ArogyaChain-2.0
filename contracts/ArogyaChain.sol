// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DecentralizedEHR {

    address public admin;
    uint256 private recordCounter;
    uint256 public constant EMERGENCY_DURATION = 1 hours;

    constructor() {
        admin = msg.sender;
    }

    /* =============================================================
                                ROLES
    ============================================================= */

    mapping(address => bool) public isPatient;

    mapping(address => bool) public isDoctor;
    mapping(address => bool) public isDoctorActive;

    mapping(address => bool) public isPharmacy;
    mapping(address => bool) public isPharmacyActive;

    mapping(address => bool) public isScanCenter;
    mapping(address => bool) public isScanCenterActive;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyPatient() {
        require(isPatient[msg.sender], "Not patient");
        _;
    }

    modifier onlyActiveDoctor() {
        require(isDoctor[msg.sender] && isDoctorActive[msg.sender], "Not active doctor");
        _;
    }

    modifier onlyActivePharmacy() {
        require(isPharmacy[msg.sender] && isPharmacyActive[msg.sender], "Not active pharmacy");
        _;
    }

    modifier onlyActiveScanCenter() {
        require(isScanCenter[msg.sender] && isScanCenterActive[msg.sender], "Not active scan center");
        _;
    }

    /* =============================================================
                            REGISTRATION
    ============================================================= */

    function registerPatient() external {
        require(!isPatient[msg.sender], "Already patient");
        isPatient[msg.sender] = true;
    }

    function registerDoctor() external {
        require(!isDoctor[msg.sender], "Already doctor");
        isDoctor[msg.sender] = true;
        isDoctorActive[msg.sender] = true;
    }

    function registerPharmacy() external {
        require(!isPharmacy[msg.sender], "Already pharmacy");
        isPharmacy[msg.sender] = true;
        isPharmacyActive[msg.sender] = true;
    }

    function registerScanCenter() external {
        require(!isScanCenter[msg.sender], "Already scan center");
        isScanCenter[msg.sender] = true;
        isScanCenterActive[msg.sender] = true;
    }

    function deactivateDoctor(address _doctor) external onlyAdmin {
        isDoctorActive[_doctor] = false;
    }

    function deactivatePharmacy(address _pharmacy) external onlyAdmin {
        isPharmacyActive[_pharmacy] = false;
    }

    function deactivateScanCenter(address _scan) external onlyAdmin {
        isScanCenterActive[_scan] = false;
    }

    /* =============================================================
                        UPLOAD PERMISSIONS
    ============================================================= */

    mapping(address => mapping(address => bool)) public doctorUploadPermission;
    mapping(address => mapping(address => bool)) public scanUploadPermission;

    function grantDoctorUpload(address doctor) external onlyPatient {
        require(isDoctor[doctor], "Not doctor");
        doctorUploadPermission[msg.sender][doctor] = true;
    }

    function revokeDoctorUpload(address doctor) external onlyPatient {
        doctorUploadPermission[msg.sender][doctor] = false;
    }

    function grantScanUpload(address scan) external onlyPatient {
        require(isScanCenter[scan], "Not scan center");
        scanUploadPermission[msg.sender][scan] = true;
    }

    function revokeScanUpload(address scan) external onlyPatient {
        scanUploadPermission[msg.sender][scan] = false;
    }

    /* =============================================================
                            RECORD STRUCTURE
    ============================================================= */

    enum UploaderRole { DOCTOR, SCAN_CENTER }
    enum RecordType { MEDICAL, SCAN }

    struct MedicalRecord {
        uint256 id;
        address patient;
        address uploader;
        UploaderRole uploaderRole;
        RecordType recordType;
        string recordCID;
        bytes32 recordHash;
        string prescriptionCID;
        uint256 timestamp;
        bool isDeleted;
    }

    mapping(uint256 => MedicalRecord) private records;
    mapping(address => uint256[]) private patientRecords;

    /* =============================================================
                        ACCESS PERMISSIONS
    ============================================================= */

    mapping(uint256 => mapping(address => bool)) private recordAccess;
    mapping(uint256 => mapping(address => bool)) private prescriptionAccess;

    mapping(uint256 => mapping(address => uint256)) private emergencyAccess;

    mapping(address => address[]) private patientActiveDoctors;
    mapping(address => mapping(address => bool)) private patientDoctorHasAccess;

    /* =============================================================
                            EVENTS
    ============================================================= */

    event RecordAdded(uint256 recordId, address patient, address uploader);
    event EmergencyAccessActivated(uint256 recordId, address doctor, uint256 expiry);

    /* =============================================================
                            ADD RECORD
    ============================================================= */

    function addMedicalRecord(
        address patient,
        string memory cid,
        bytes32 hash,
        string memory prescriptionCID
    ) external onlyActiveDoctor {

        require(isPatient[patient], "Invalid patient");
        require(doctorUploadPermission[patient][msg.sender], "Upload not permitted");

        recordCounter++;

        records[recordCounter] = MedicalRecord({
            id: recordCounter,
            patient: patient,
            uploader: msg.sender,
            uploaderRole: UploaderRole.DOCTOR,
            recordType: RecordType.MEDICAL,
            recordCID: cid,
            recordHash: hash,
            prescriptionCID: prescriptionCID,
            timestamp: block.timestamp,
            isDeleted: false
        });

        patientRecords[patient].push(recordCounter);

        recordAccess[recordCounter][patient] = true;
        recordAccess[recordCounter][msg.sender] = true;

        _addDoctorToPatientList(patient, msg.sender);

        emit RecordAdded(recordCounter, patient, msg.sender);
    }

    function addScanRecord(
        address patient,
        string memory cid,
        bytes32 hash
    ) external onlyActiveScanCenter {

        require(isPatient[patient], "Invalid patient");
        require(scanUploadPermission[patient][msg.sender], "Upload not permitted");

        recordCounter++;

        records[recordCounter] = MedicalRecord({
            id: recordCounter,
            patient: patient,
            uploader: msg.sender,
            uploaderRole: UploaderRole.SCAN_CENTER,
            recordType: RecordType.SCAN,
            recordCID: cid,
            recordHash: hash,
            prescriptionCID: "",
            timestamp: block.timestamp,
            isDeleted: false
        });

        patientRecords[patient].push(recordCounter);

        recordAccess[recordCounter][patient] = true;
        recordAccess[recordCounter][msg.sender] = true;

        emit RecordAdded(recordCounter, patient, msg.sender);
    }

    /* =============================================================
                        GRANT / REVOKE ACCESS
    ============================================================= */

    function grantRecordAccess(uint256 recordId, address doctor) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "Not owner");
        require(!record.isDeleted, "Deleted");
        require(isDoctor[doctor], "Not doctor");

        recordAccess[recordId][doctor] = true;
        _addDoctorToPatientList(msg.sender, doctor);
    }

    function revokeRecordAccess(uint256 recordId, address doctor) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "Not owner");
        recordAccess[recordId][doctor] = false;
    }

    function grantPrescriptionAccess(uint256 recordId, address pharmacy) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "Not owner");
        require(isPharmacy[pharmacy], "Not pharmacy");

        prescriptionAccess[recordId][pharmacy] = true;
    }

    function revokePrescriptionAccess(uint256 recordId, address pharmacy) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "Not owner");

        prescriptionAccess[recordId][pharmacy] = false;
    }

    /* =============================================================
                            EMERGENCY ACCESS
    ============================================================= */

    function activateEmergencyAccess(uint256 recordId) external onlyActiveDoctor {
        MedicalRecord storage record = records[recordId];
        require(!record.isDeleted, "Deleted");

        uint256 expiry = block.timestamp + EMERGENCY_DURATION;
        emergencyAccess[recordId][msg.sender] = expiry;

        emit EmergencyAccessActivated(recordId, msg.sender, expiry);
    }

    /* =============================================================
                            VIEW FUNCTIONS
    ============================================================= */

    function viewRecord(uint256 recordId) external view returns (MedicalRecord memory) {
        MedicalRecord memory record = records[recordId];
        require(!record.isDeleted, "Deleted");

        bool hasNormalAccess = recordAccess[recordId][msg.sender];
        bool hasEmergencyAccess = emergencyAccess[recordId][msg.sender] >= block.timestamp;

        if (isDoctor[msg.sender]) {
            require(isDoctorActive[msg.sender], "Inactive doctor");
        }

        require(
            msg.sender == record.patient ||
            hasNormalAccess ||
            hasEmergencyAccess,
            "Access denied"
        );

        return record;
    }

    function viewPrescription(uint256 recordId) external view onlyActivePharmacy returns (string memory) {
        require(prescriptionAccess[recordId][msg.sender], "No access");
        require(!records[recordId].isDeleted, "Deleted");

        return records[recordId].prescriptionCID;
    }

    function getMyRecords() external view onlyPatient returns (uint256[] memory) {
        return patientRecords[msg.sender];
    }

    /* =============================================================
                            DELETE RECORD
    ============================================================= */

    function deleteRecord(uint256 recordId) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "Not owner");
        record.isDeleted = true;
    }

    /* =============================================================
                            INTERNAL
    ============================================================= */

    function _addDoctorToPatientList(address patient, address doctor) internal {
        if (!patientDoctorHasAccess[patient][doctor]) {
            patientDoctorHasAccess[patient][doctor] = true;
            patientActiveDoctors[patient].push(doctor);
        }
    }
}
