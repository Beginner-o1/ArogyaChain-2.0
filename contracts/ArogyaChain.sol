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
                         ERROR CODE REFERENCE
        E01  Not admin
        E02  Not patient
        E03  Not a doctor
        E04  Not a pharmacy
        E05  Not a scan center
        E06  Already registered
        E07  Required field empty (name / license / location / title)
        E08  Invalid patient
        E09  Upload not permitted
        E10  Not record owner
        E11  Record deleted
        E12  Access denied
        E13  No prescription on this record
    ============================================================= */

    /* =============================================================
                                ROLES
    ============================================================= */

    mapping(address => bool) public isPatient;
    mapping(address => bool) public isDoctor;
    mapping(address => bool) public isPharmacy;
    mapping(address => bool) public isScanCenter;

    modifier onlyAdmin() {
        require(msg.sender == admin, "E01");
        _;
    }

    modifier onlyPatient() {
        require(isPatient[msg.sender], "E02");
        _;
    }

    modifier onlyActiveDoctor() {
        require(isDoctor[msg.sender], "E03");
        _;
    }

    modifier onlyActivePharmacy() {
        require(isPharmacy[msg.sender], "E04");
        _;
    }

    modifier onlyActiveScanCenter() {
        require(isScanCenter[msg.sender], "E05");
        _;
    }

    /* =============================================================
                          PROFILE STRUCTS
    ============================================================= */

    struct DoctorProfile {
        string fullName;        // e.g. "Dr. Sarah Mitchell"
        string licenseNumber;   // e.g. "MCI-2024-78432"
        string contactEmail;    // e.g. "sarah@apollo.com"
    }

    struct PharmacyProfile {
        string pharmacyName;    // e.g. "MedPlus Pharmacy"
        string licenseNumber;   // e.g. "PH-TN-2024-00321"
        string location;        // e.g. "Chennai, Tamil Nadu"
        string contactEmail;    // e.g. "medplus@example.com"
        string contactPhone;    // e.g. "+91-9876543210"
    }

    struct ScanCenterProfile {
        string centerName;      // e.g. "ClearView Radiology"
        string licenseNumber;   // e.g. "SC-KA-2024-11245"
        string location;        // e.g. "Bangalore, Karnataka"
        string contactEmail;    // e.g. "info@clearview.com"
        string contactPhone;
    }

    mapping(address => DoctorProfile)     private doctorProfiles;
    mapping(address => PharmacyProfile)   private pharmacyProfiles;
    mapping(address => ScanCenterProfile) private scanCenterProfiles;

    /* =============================================================
                            REGISTRATION
    ============================================================= */

    function registerPatient() external {
        require(!isPatient[msg.sender], "E06");
        isPatient[msg.sender] = true;
    }

    function registerDoctor(
        string calldata fullName,
        string calldata licenseNumber,
        string calldata contactEmail
    ) external {
        require(!isDoctor[msg.sender],           "E06");
        require(bytes(fullName).length > 0,      "E07");
        require(bytes(licenseNumber).length > 0, "E07");

        isDoctor[msg.sender] = true;

        doctorProfiles[msg.sender] = DoctorProfile({
            fullName:      fullName,
            licenseNumber: licenseNumber,
            contactEmail:  contactEmail
        });
    }

    function registerPharmacy(
        string calldata pharmacyName,
        string calldata licenseNumber,
        string calldata location,
        string calldata contactEmail,
        string calldata contactPhone
    ) external {
        require(!isPharmacy[msg.sender],         "E06");
        require(bytes(pharmacyName).length > 0,  "E07");
        require(bytes(licenseNumber).length > 0, "E07");
        require(bytes(location).length > 0,      "E07");

        isPharmacy[msg.sender] = true;

        pharmacyProfiles[msg.sender] = PharmacyProfile({
            pharmacyName:  pharmacyName,
            licenseNumber: licenseNumber,
            location:      location,
            contactEmail:  contactEmail,
            contactPhone:  contactPhone
        });
    }

    function registerScanCenter(
        string calldata centerName,
        string calldata licenseNumber,
        string calldata location,
        string calldata contactEmail,
        string calldata contactPhone
    ) external {
        require(!isScanCenter[msg.sender],        "E06");
        require(bytes(centerName).length > 0,     "E07");
        require(bytes(licenseNumber).length > 0,  "E07");

        isScanCenter[msg.sender] = true;

        scanCenterProfiles[msg.sender] = ScanCenterProfile({
            centerName:    centerName,
            licenseNumber: licenseNumber,
            location:      location,
            contactEmail:  contactEmail,
            contactPhone:  contactPhone
        });
    }

    /* =============================================================
                       PROFILE VIEW FUNCTIONS
    ============================================================= */

    function getDoctorProfile(address doctor)
        external view returns (DoctorProfile memory)
    {
        require(isDoctor[doctor], "E03");
        return doctorProfiles[doctor];
    }

    function getPharmacyProfile(address pharmacy)
        external view returns (PharmacyProfile memory)
    {
        require(isPharmacy[pharmacy], "E04");
        return pharmacyProfiles[pharmacy];
    }

    function getScanCenterProfile(address scan)
        external view returns (ScanCenterProfile memory)
    {
        require(isScanCenter[scan], "E05");
        return scanCenterProfiles[scan];
    }

    function getMyDoctorProfile()
        external view returns (DoctorProfile memory)
    {
        return doctorProfiles[msg.sender];
    }

    function getMyPharmacyProfile()
        external view returns (PharmacyProfile memory)
    {
        return pharmacyProfiles[msg.sender];
    }

    function getMyScanCenterProfile()
        external view returns (ScanCenterProfile memory)
    {
        return scanCenterProfiles[msg.sender];
    }

    /* =============================================================
                          ADMIN DEACTIVATION
    ============================================================= */

    function deactivateDoctor(address _doctor) external onlyAdmin {
        isDoctor[_doctor] = false;
    }

    function deactivatePharmacy(address _pharmacy) external onlyAdmin {
        isPharmacy[_pharmacy] = false;
    }

    function deactivateScanCenter(address _scan) external onlyAdmin {
        isScanCenter[_scan] = false;
    }

    /* =============================================================
                        UPLOAD PERMISSIONS
    ============================================================= */

    mapping(address => mapping(address => bool)) public doctorUploadPermission;
    mapping(address => mapping(address => bool)) public scanUploadPermission;

    mapping(address => address[])                private patientGrantedDoctors;
    mapping(address => mapping(address => bool)) private patientDoctorUploadTracked;

    mapping(address => address[])                private patientGrantedScanCenters;
    mapping(address => mapping(address => bool)) private patientScanCenterUploadTracked;

    function _trackDoctorUpload(address patient, address doctor) internal {
        if (!patientDoctorUploadTracked[patient][doctor]) {
            patientDoctorUploadTracked[patient][doctor] = true;
            patientGrantedDoctors[patient].push(doctor);
        }
    }

    function _trackScanUpload(address patient, address scan) internal {
        if (!patientScanCenterUploadTracked[patient][scan]) {
            patientScanCenterUploadTracked[patient][scan] = true;
            patientGrantedScanCenters[patient].push(scan);
        }
    }

    function grantDoctorUpload(address doctor) external onlyPatient {
        require(isDoctor[doctor], "E03");
        doctorUploadPermission[msg.sender][doctor] = true;
        _trackDoctorUpload(msg.sender, doctor);
    }

    function revokeDoctorUpload(address doctor) external onlyPatient {
        doctorUploadPermission[msg.sender][doctor] = false;
    }

    function grantScanUpload(address scan) external onlyPatient {
        require(isScanCenter[scan], "E05");
        scanUploadPermission[msg.sender][scan] = true;
        _trackScanUpload(msg.sender, scan);
    }

    function revokeScanUpload(address scan) external onlyPatient {
        scanUploadPermission[msg.sender][scan] = false;
    }

    function getMyGrantedDoctors() external view onlyPatient returns (address[] memory) {
        address[] storage all = patientGrantedDoctors[msg.sender];
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (doctorUploadPermission[msg.sender][all[i]]) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (doctorUploadPermission[msg.sender][all[i]]) {
                active[idx++] = all[i];
            }
        }
        return active;
    }

    function getMyGrantedScanCenters() external view onlyPatient returns (address[] memory) {
        address[] storage all = patientGrantedScanCenters[msg.sender];
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (scanUploadPermission[msg.sender][all[i]]) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (scanUploadPermission[msg.sender][all[i]]) {
                active[idx++] = all[i];
            }
        }
        return active;
    }

    /* =============================================================
                            RECORD STRUCTURE
    ============================================================= */

    enum UploaderRole { DOCTOR, SCAN_CENTER }
    enum RecordType   { MEDICAL, SCAN }

    struct MedicalRecord {
        uint256 id;
        address patient;
        address uploader;
        UploaderRole uploaderRole;
        RecordType recordType;
        string title;
        string recordCID;
        bytes32 recordHash;
        string prescriptionCID;
        uint256 timestamp;
        bool isDeleted;
    }

    mapping(uint256 => MedicalRecord) private records;
    mapping(address => uint256[])     private patientRecords;

    /* =============================================================
                        ACCESS PERMISSIONS
    ============================================================= */

    mapping(uint256 => mapping(address => bool))    private recordAccess;
    mapping(uint256 => mapping(address => bool))    private prescriptionAccess;
    mapping(uint256 => mapping(address => uint256)) private emergencyAccess;

    mapping(address => address[])                private patientActiveDoctors;
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
        string memory title,
        string memory cid,
        bytes32 hash,
        string memory prescriptionCID
    ) external onlyActiveDoctor {
        require(isPatient[patient], "E08");
        require(doctorUploadPermission[patient][msg.sender], "E09");
        require(bytes(title).length > 0, "E07");

        recordCounter++;

        records[recordCounter] = MedicalRecord({
            id:              recordCounter,
            patient:         patient,
            uploader:        msg.sender,
            uploaderRole:    UploaderRole.DOCTOR,
            recordType:      RecordType.MEDICAL,
            title:           title,
            recordCID:       cid,
            recordHash:      hash,
            prescriptionCID: prescriptionCID,
            timestamp:       block.timestamp,
            isDeleted:       false
        });

        patientRecords[patient].push(recordCounter);
        recordAccess[recordCounter][patient]    = true;
        recordAccess[recordCounter][msg.sender] = true;
        _addDoctorToPatientList(patient, msg.sender);

        emit RecordAdded(recordCounter, patient, msg.sender);
    }

    function addScanRecord(
        address patient,
        string memory title,
        string memory cid,
        bytes32 hash
    ) external onlyActiveScanCenter {
        require(isPatient[patient], "E08");
        require(scanUploadPermission[patient][msg.sender], "E09");
        require(bytes(title).length > 0, "E07");

        recordCounter++;

        records[recordCounter] = MedicalRecord({
            id:              recordCounter,
            patient:         patient,
            uploader:        msg.sender,
            uploaderRole:    UploaderRole.SCAN_CENTER,
            recordType:      RecordType.SCAN,
            title:           title,
            recordCID:       cid,
            recordHash:      hash,
            prescriptionCID: "",
            timestamp:       block.timestamp,
            isDeleted:       false
        });

        patientRecords[patient].push(recordCounter);
        recordAccess[recordCounter][patient]    = true;
        recordAccess[recordCounter][msg.sender] = true;

        emit RecordAdded(recordCounter, patient, msg.sender);
    }

    /* =============================================================
                        GRANT / REVOKE RECORD ACCESS
    ============================================================= */

    function grantRecordAccess(uint256 recordId, address doctor) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "E10");
        require(!record.isDeleted, "E11");
        require(isDoctor[doctor], "E03");

        recordAccess[recordId][doctor] = true;
        _addDoctorToPatientList(msg.sender, doctor);
    }

    function revokeRecordAccess(uint256 recordId, address doctor) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "E10");
        recordAccess[recordId][doctor] = false;
    }

    function grantPrescriptionAccess(uint256 recordId, address pharmacy) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "E10");
        require(isPharmacy[pharmacy], "E04");
        prescriptionAccess[recordId][pharmacy] = true;
    }

    function revokePrescriptionAccess(uint256 recordId, address pharmacy) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "E10");
        prescriptionAccess[recordId][pharmacy] = false;
    }

    /* =============================================================
                          EMERGENCY ACCESS
    ============================================================= */

    function activateEmergencyAccess(uint256 recordId) external onlyActiveDoctor {
        MedicalRecord storage record = records[recordId];
        require(!record.isDeleted, "E11");

        uint256 expiry = block.timestamp + EMERGENCY_DURATION;
        emergencyAccess[recordId][msg.sender] = expiry;

        emit EmergencyAccessActivated(recordId, msg.sender, expiry);
    }

    /* =============================================================
                            VIEW FUNCTIONS
    ============================================================= */

    function viewRecord(uint256 recordId) external view returns (MedicalRecord memory) {
        MedicalRecord memory record = records[recordId];
        require(!record.isDeleted, "E11");

        bool hasNormalAccess    = recordAccess[recordId][msg.sender];
        bool hasEmergencyAccess = emergencyAccess[recordId][msg.sender] >= block.timestamp;

        require(
            msg.sender == record.patient ||
            hasNormalAccess ||
            hasEmergencyAccess,
            "E12"
        );

        return record;
    }

    function viewPrescription(uint256 recordId) external view returns (string memory) {
        MedicalRecord storage record = records[recordId];
        require(!record.isDeleted, "E11");
        require(bytes(record.prescriptionCID).length > 0, "E13");

        bool isOwner          = msg.sender == record.patient;
        bool isGrantedPharmacy = isPharmacy[msg.sender]
                                  && prescriptionAccess[recordId][msg.sender];

        require(isOwner || isGrantedPharmacy, "E12");

        return record.prescriptionCID;
    }

    function getMyRecords() external view onlyPatient returns (uint256[] memory) {
        return patientRecords[msg.sender];
    }

    function getMyAccessDoctors() external view onlyPatient returns (address[] memory) {
        return patientActiveDoctors[msg.sender];
    }

    /* =============================================================
                            DELETE RECORD
    ============================================================= */

    function deleteRecord(uint256 recordId) external onlyPatient {
        MedicalRecord storage record = records[recordId];
        require(record.patient == msg.sender, "E10");
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
