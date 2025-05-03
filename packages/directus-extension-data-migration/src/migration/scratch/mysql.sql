# Active modules
select c.Title, c.Format, c.QuizID
from Subscriptions s
         join Courses c on s.CourseID = c.CourseID
# where c.QuizID is null
where c.ArchivedDate is null
  and c.IsActive is true
  and c.DeletedAt is null;
# group by c.Title;


# For both Documents and Policies, import once, then ignore assignments not in the list
# global policies
#              https://corela.healthcarestaffinghire.com/system/policies/6458/policy_65671616117b6.pdf
#              https://corela.healthcarestaffinghire.com/system/policies/8/policy_65671616117b6.pdf
# value="https://corela.healthcarestaffinghire.com/local/policies/11/NonDiscriminationPolicy.pdf"
# select SystemPoliciesID, PolicyID, PortalID, CONCAT('https://corela.healthcarestaffinghire.com/local/policies/', PolicyID, '/', PolicyDoc), CONCAT('https://corela.healthcarestaffinghire.com/system/policies/', SystemPoliciesID, '/', PolicyDoc)
select IsCustom, PolicyID, PortalID, Title
from Policies
where Title in (
                'Non-Discrimination Policy',
                'Joint Commission Standards',
                'Joint Commission Standards - Hospital National Patient Safety Goals 2020',
                'Joint Commission Standards - National Patient Safety Goals',
                'Joint Commission Standards - National Patient Safety Goals - 2023',
                'Joint Commission Standards - National Patient Safety Goals 2021',
                'National Patient Safety Goals 2023',
                'National Patient Safety Goals 2024'
    );
# and PolicyID = 6458;

# select CONCAT('https://healthcarestaffinghire.com/local/policies/', PolicyID, '/', PolicyDoc)
# agency policies
select pl.PolicyID, pl.PortalID, p.CompanyName, pl.Title
from Policies pl
         join PortalConfiguration p on pl.PortalID = p.PortalID
where Title in (
                '5 Star Medical Employee Handbook',
                'CMA/Phlebotomist Job Description',
                'CNA',
                'CNA/MT Job description',
                'COVID-19 Module and Attestation',
                'COVID-19 Vaccine Protocol Education',
                'Emergency Room Nurse Job Description',
                'Flu Declination',
                'Intensive Care Unit Nurse Job Description',
                'Job & Employment Classification Notification',
                'Job Description, CNA',
                'JSNA Application Attestation',
                'JSNA EEO Data Form',
                'JSNA Employee Health Statement',
                'JSNA Employee Job Description',
                'JSNA Hepatitus B Disclosure',
                'JSNA Latex Allergy Screening Tool',
                'JSNA Reference Sheet',
                'JSNA Sexual Harrassment Policy',
                'JSNA Social Media Policy',
                'JSNA Substance Abuse Policy',
                'JSNA Tuberculosis Surveillance',
                'JSNA Workers Compensation Policy',
                'LPN Job Description',
                'Medical Surgical Nurse Job Description',
                'Orientation Module 2023',
                'Psychiatric Nurse Job Description',
                'Swiss CNA Packet',
                'Swiss RN/QMA Packet'
    )
order by p.PortalID asc;


# global documents
select DocumentID, PortalID, Title
from Library
where Title in (
                'Ambulatory Health Care National Patient Safety Goal 2022',
                'Ambulatory Health Care National Patient Safety Goals 2021',
                'Ambulatory Health Care Program National Patient Safety Goals 2022',
                'Ambulatory Health Care: 2023 National Patient Safety Goals',
                'Assisted Living Community Program National Patient Safety Goal 2022',
                'Assisted Living Community Program National Patient Safety Goals 2022',
                'Assisted Living Community: 2023 National Patient Safety Goals',
                'Behavioral Health Care and Human Service National Patient Safety Goals 2022',
                'Behavioral Health Care and Human Services Program National Patient Safety Goals 2022',
                'Behavioral Health Care and Human Services: 2023 National Patient Safety Goals',
                'Core Mandatory Study Guide',
                'Critical Access Hospital National Patient Safety Goal 2022',
                'Critical Access Hospital National Patient Safety Goals 2022',
                'Critical Access Hospital: 2023 National Patient Safety Goals',
                'Critical Access Hospital: 2024 National Patient Safety Goals',
                'EKG Study Guide',
                'Home Care National Patient Safety Goals 2021',
                'Home Care Program National Patient Safety Goal 2022',
                'Home Care: 2023 National Patient Safety Goal',
                'Hospital National Patient Safety Goals 2021',
                'Hospital Program National Patient Safety Goal 2022',
                'Hospital Program National Patient Safety Goals 2022',
                'Hospital: 2023 National Patient Safety Goals',
                'Laboratory National Patient Safety Goals 2021',
                'Laboratory Program National Patient Safety Goal 2022',
                'Laboratory Program National Patient Safety Goals 2022',
                'Laboratory Services: 2023 National Patient Safety Goals',
                'National Patient Safety Goals 2022',
                'National Patient Safety Goals 2023',
                'Nursing Care Center Program National Patient Safety Goal 2022',
                'Nursing Care Center Program National Patient Safety Goals 2022',
                'Nursing Care Center: 2023 National Patient Safety Goals',
                'Nursing Care Center: 2024 National Patient Safety Goals',
                'Nursing Care National Patient Safety Goals 2021',
                'Office Based Surgery Program National Patient Safety Goal 2022',
                'Office Based Surgery Program National Patient Safety Goals 2022',
                'Office-Based Surgery: 2023 National Patient Safety Goals',
                'RN - Medication/Pharmacology - General Study Guide',
                'RN - Telemetry Study Guide'
    )
order by PortalID asc;

# agency documents
select DocumentID, PortalID, Title
from Library
where Title in (
                'CompHealth Orientation Module Study Guide',
                'GQR Employee Handbook',
                'HumanEdge Temporary Employee Manual',
                'RN Network Orientation Module Study Guide'
    )
order by PortalID asc;

# Kim
select *
from Affirmations
where StudentID in (120279, 269225)
  and DueDate is null;
#   and (DueDate is null
#            and DueDate >= now()
#       );

# Pettus
select *
from Affirmations
where StudentID = 269225
  and DueDate is null;

select *
from Affirmations
where StudentID = 120279
  and AffirmationID = (select max(AffirmationID) from Affirmations where StudentID = 120279)
group by PolicyID;

explain analyze
select *
from Affirmations
where AffirmationID in (select max(AffirmationID)
                        from Affirmations
                        where StudentID = 120279
                        group by PolicyID);

select a.*
from Affirmations a
where a.AffirmationID = (select max(a1.AffirmationID) from Affirmations a1 where a1.AffirmationID = a.AffirmationID)
  and a.StudentID = 120279
group by a.PolicyID;
# where StudentID = 320160
# having AffirmationID = max(AffirmationID);
# group by PolicyID;

select *
from Subscriptions s
         join Courses c on s.CourseID = c.CourseID
where s.StudentID = 34740
  and s.Status = 'Assigned'
  and c.QuizID is not null;

select count(*) as total, g.GroupID, g.PortalID, p.CompanyName, g.GroupName
from `Groups` g
         join GroupSubs gs on g.GroupID = gs.GroupID
         join PortalConfiguration p on g.PortalID = p.PortalID
# where g.PortalID = 10
# where g.PortalID = 10
group by g.GroupID
order by total desc
limit 10;

select StudentID
from Students
where Email = 'credentialing+ugonna.nwobi@corela.us';

select *
from LibraryAssignments
where StudentID = 1458;

select l.Title, la.ID, la.AssignedDate, la.LastAccess
from LibraryAssignments la
         join Library l on la.LibraryID = l.DocumentID
where StudentID = 1458;


select distinct(ExamDuration)
from Courses;

SELECT COUNT(*)                              AS count,
       Email,
       GROUP_CONCAT(RoleID SEPARATOR ', ')   as roles,
       GROUP_CONCAT(PortalID SEPARATOR ', ') as portals
FROM Students
WHERE Email NOT REGEXP 'empower|hs-hire'
  AND Status = 'Active'
#   AND StudentID in (select StudentID
#                     from Students
#                     where PortalID = 10
#                       and RoleID != 5
#                       and Email NOT REGEXP 'empower|hs-hire'
#                       and Status = 'Active')
GROUP BY Email
HAVING count > 1
   AND roles REGEXP '1|2|3|4'
ORDER BY count DESC;

select distinct(RoleID)
from Students
where PortalID = 10;

select *
from Students
where PortalID = 10
  and RoleID in (2, 4)
  and Email NOT REGEXP 'empower|hs-hire'
    and DeletedAt is null;

select *
from UserRoles

select * from Students where StudentID = 1847;

select *
from StudentSupervisors
where StudentID in (select StudentID
                    from Students
                    where PortalID = 10);


select g.GroupName, s.Name, s.Email
from `Groups` g
join GroupSupervisors gs on g.GroupID = gs.GroupID
join Students s on gs.StudentID = s.StudentID
where g.PortalID = 10;

select count(*)
from Students
where LastAccess > '2024-01-01'
# and PortalID = 10;
